import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { JsonFileStorage, AuthUser, AuthSession } from './json-storage';

// Environment variables with defaults
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Rate limiting
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation rules
export const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

export const mfaValidation = [
  body('token').isLength({ min: 6, max: 6 }).isNumeric(),
];

// Extended Request interface to include user
export interface AuthRequest extends Request {
  user?: AuthUser;
  session?: AuthSession;
}

export class AuthService {
  private storage: JsonFileStorage;

  constructor(storage: JsonFileStorage) {
    this.storage = storage;
  }

  // Generate JWT tokens
  generateTokens(userId: number): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
    return { accessToken, refreshToken };
  }

  // Verify JWT token
  verifyToken(token: string, isRefresh = false): { userId: number } | null {
    try {
      const secret = isRefresh ? JWT_REFRESH_SECRET : JWT_SECRET;
      const decoded = jwt.verify(token, secret) as { userId: number };
      return decoded;
    } catch {
      return null;
    }
  }

  // Hash password
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  // Verify password
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Generate MFA secret
  generateMfaSecret(username: string): { secret: string; qrCodeUrl: string } {
    const secret = speakeasy.generateSecret({
      name: `Ultimate Pixel Sheets (${username})`,
      issuer: 'Ultimate Pixel Sheets',
      length: 32,
    });

    return {
      secret: secret.base32!,
      qrCodeUrl: secret.otpauth_url!,
    };
  }

  // Verify MFA token
  verifyMfaToken(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow tokens from 2 steps before/after current
    });
  }

  // Generate backup codes
  generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }
    return codes;
  }

  // Check if user is locked
  isUserLocked(user: AuthUser): boolean {
    return user.lockedUntil ? new Date() < user.lockedUntil : false;
  }

  // Handle failed login attempt
  async handleFailedLogin(user: AuthUser): Promise<void> {
    const attempts = user.loginAttempts + 1;
    const updates: Partial<AuthUser> = { loginAttempts: attempts };

    // Lock account after 5 failed attempts for 30 minutes
    if (attempts >= 5) {
      updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    }

    await this.storage.updateAuthUser(user.id, updates);
  }

  // Handle successful login
  async handleSuccessfulLogin(user: AuthUser): Promise<void> {
    await this.storage.updateAuthUser(user.id, {
      loginAttempts: 0,
      lockedUntil: undefined,
      lastLogin: new Date(),
    });
  }

  // Register new user
  async register(userData: {
    username: string;
    email: string;
    password: string;
    role?: 'admin' | 'editor' | 'viewer';
  }): Promise<{ user: AuthUser; tokens: { accessToken: string; refreshToken: string } }> {
    // Check if user already exists
    const existingUser = await this.storage.getUserByEmail(userData.email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    const existingUsername = await this.storage.getUserByUsername(userData.username);
    if (existingUsername) {
      throw new Error('Username is already taken');
    }

    // Create user
    const hashedPassword = await this.hashPassword(userData.password);
    const user = await this.storage.createAuthUser({
      ...userData,
      password: hashedPassword,
      role: userData.role || 'editor',
    });

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    // Create session
    await this.storage.createSession({
      userId: user.id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      isRememberMe: false,
    });

    return { user, tokens };
  }

  // Login user
  async login(
    email: string,
    password: string,
    rememberMe = false
  ): Promise<{ user: AuthUser; tokens: { accessToken: string; refreshToken: string } }> {
    // Find user
    const user = await this.storage.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (this.isUserLocked(user)) {
      throw new Error('Account is temporarily locked. Please try again later.');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      await this.handleFailedLogin(user);
      throw new Error('Invalid credentials');
    }

    // Handle successful login
    await this.handleSuccessfulLogin(user);

    // Generate tokens
    const tokens = this.generateTokens(user.id);

    // Create session
    const expiresAt = rememberMe 
      ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.storage.createSession({
      userId: user.id,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt,
      isRememberMe: rememberMe,
    });

    return { user, tokens };
  }

  // Setup MFA
  async setupMfa(userId: number): Promise<{ secret: string; qrCodeDataUrl: string; backupCodes: string[] }> {
    const user = await this.storage.getUser(userId) as AuthUser;
    if (!user) {
      throw new Error('User not found');
    }

    const { secret, qrCodeUrl } = this.generateMfaSecret(user.username);
    const backupCodes = this.generateBackupCodes();

    // Generate QR code data URL
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl);

    // Save MFA secret and backup codes (not enabled yet)
    await this.storage.updateAuthUser(userId, {
      mfaSecret: secret,
      mfaBackupCodes: backupCodes,
    });

    return { secret, qrCodeDataUrl, backupCodes };
  }

  // Verify and enable MFA
  async verifyAndEnableMfa(userId: number, token: string): Promise<void> {
    const user = await this.storage.getUser(userId) as AuthUser;
    if (!user || !user.mfaSecret) {
      throw new Error('MFA setup not initiated');
    }

    const isValid = this.verifyMfaToken(token, user.mfaSecret);
    if (!isValid) {
      throw new Error('Invalid MFA token');
    }

    // Enable MFA
    await this.storage.updateAuthUser(userId, { mfaEnabled: true });
  }

  // Disable MFA
  async disableMfa(userId: number, password: string): Promise<void> {
    const user = await this.storage.getUser(userId) as AuthUser;
    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    // Disable MFA and clear secrets
    await this.storage.updateAuthUser(userId, {
      mfaEnabled: false,
      mfaSecret: undefined,
      mfaBackupCodes: undefined,
    });
  }

  // Logout (delete session)
  async logout(token: string): Promise<void> {
    await this.storage.deleteSession(token);
  }

  // Logout all sessions for a user
  async logoutAllSessions(userId: number): Promise<void> {
    await this.storage.deleteUserSessions(userId);
  }
}

// Middleware to authenticate requests
export function authenticateToken(storage: JsonFileStorage) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      console.log('Auth middleware - Path:', req.path, 'Header:', authHeader ? 'Present' : 'Missing');

      if (!token) {
        console.log('Auth middleware - No token provided');
        return res.status(401).json({ error: 'Access token required' });
      }

      // Verify token
      const authService = new AuthService(storage);
      const decoded = authService.verifyToken(token);
      
      if (!decoded) {
        console.log('Auth middleware - Token verification failed');
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Get session
      const session = await storage.getSession(token);
      if (!session || session.expiresAt < new Date()) {
        console.log('Auth middleware - Session not found or expired');
        return res.status(401).json({ error: 'Session expired' });
      }

      // Get user
      const user = await storage.getUser(decoded.userId) as AuthUser;
      if (!user) {
        console.log('Auth middleware - User not found for ID:', decoded.userId);
        return res.status(401).json({ error: 'User not found' });
      }

      console.log('Auth middleware - User authenticated:', user.id, user.email);
      req.user = user;
      req.session = session;
      next();
    } catch (error) {
      console.log('Auth middleware - Error:', error.message);
      res.status(401).json({ error: 'Authentication failed' });
    }
  };
}

// Middleware to check user roles
export function requireRole(...roles: ('admin' | 'editor' | 'viewer')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Middleware to check MFA for sensitive operations
export function requireMfa(storage: JsonFileStorage) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // If user has MFA enabled, verify MFA token
    if (req.user.mfaEnabled) {
      const mfaToken = req.headers['x-mfa-token'] as string;
      
      if (!mfaToken) {
        return res.status(403).json({ error: 'MFA token required' });
      }

      const authService = new AuthService(storage);
      const isValid = authService.verifyMfaToken(mfaToken, req.user.mfaSecret!);
      
      if (!isValid) {
        return res.status(403).json({ error: 'Invalid MFA token' });
      }
    }

    next();
  };
}

// Helper function to check validation errors
export function checkValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
}