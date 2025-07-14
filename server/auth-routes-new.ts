import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { storage } from './storage';

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { message: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later' },
});

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  twoFactorToken: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

// JWT secrets
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EMAIL_SECRET = process.env.JWT_EMAIL_SECRET || 'your-email-secret-key';

// Token generation
const generateAccessToken = (userId: number) => {
  return jwt.sign({ userId, type: 'access' }, JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (userId: number) => {
  return jwt.sign({ userId, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

const generateEmailToken = (userId: number, email: string) => {
  return jwt.sign({ userId, email, type: 'email' }, JWT_EMAIL_SECRET, { expiresIn: '24h' });
};

// Middleware
const authenticateToken = async (req: any, res: Response, next: Function) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as any;
    if (decoded.type !== 'access') {
      return res.status(403).json({ message: 'Invalid token type' });
    }
    
    const user = await storage.getUserById(decoded.userId);
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Helper functions
const sendEmailVerification = async (email: string, token: string) => {
  // In production, integrate with email service (SendGrid, SES, etc.)
  console.log(`Email verification token for ${email}: ${token}`);
  // For demo, we'll just log it
};

const sendPasswordReset = async (email: string, token: string) => {
  // In production, integrate with email service
  console.log(`Password reset token for ${email}: ${token}`);
};

// Routes

// Register
router.post('/register', generalLimiter, async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    const { username, email, password } = validatedData;

    // Check if user already exists
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const existingUsername = await storage.getUserByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      emailVerified: false,
      twoFactorEnabled: false,
    });

    // Generate email verification token
    const emailToken = generateEmailToken(user.id, email);
    await sendEmailVerification(email, emailToken);

    res.status(201).json({
      message: 'User created successfully. Please check your email to verify your account.',
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login
router.post('/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { email, password, twoFactorToken, rememberMe } = validatedData;

    // Find user
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        return res.status(200).json({ 
          requiresTwoFactor: true,
          message: 'Two-factor authentication required'
        });
      }

      // Verify 2FA token
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret!,
        encoding: 'base32',
        token: twoFactorToken,
        window: 2,
      });

      if (!verified) {
        // Check backup codes
        const backupCodes = user.backupCodes || [];
        const hashedToken = crypto.createHash('sha256').update(twoFactorToken).digest('hex');
        const backupCodeIndex = backupCodes.findIndex(code => code === hashedToken);
        
        if (backupCodeIndex === -1) {
          return res.status(401).json({ message: 'Invalid two-factor authentication code' });
        }

        // Remove used backup code
        backupCodes.splice(backupCodeIndex, 1);
        await storage.updateUser(user.id, { backupCodes });
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Set refresh token as httpOnly cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 7 days or 1 day
    };

    res.cookie('refreshToken', refreshToken, cookieOptions);

    // Return user data (without sensitive info)
    const { password: _, twoFactorSecret: __, backupCodes: ___, ...userWithoutSensitiveInfo } = user;

    res.json({
      message: 'Login successful',
      accessToken,
      user: userWithoutSensitiveInfo,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', generalLimiter, async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
    if (decoded.type !== 'refresh') {
      return res.status(403).json({ message: 'Invalid token type' });
    }

    const user = await storage.getUserById(decoded.userId);
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }

    // Generate new access token
    const accessToken = generateAccessToken(user.id);

    // Return user data (without sensitive info)
    const { password: _, twoFactorSecret: __, backupCodes: ___, ...userWithoutSensitiveInfo } = user;

    res.json({
      accessToken,
      user: userWithoutSensitiveInfo,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(403).json({ message: 'Invalid or expired refresh token' });
  }
});

// Logout
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticateToken, async (req: any, res: Response) => {
  const { password: _, twoFactorSecret: __, backupCodes: ___, ...userWithoutSensitiveInfo } = req.user;
  res.json(userWithoutSensitiveInfo);
});

// Verify email
router.post('/verify-email', generalLimiter, async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Verification token required' });
    }

    const decoded = jwt.verify(token, JWT_EMAIL_SECRET) as any;
    if (decoded.type !== 'email') {
      return res.status(400).json({ message: 'Invalid token type' });
    }

    const user = await storage.getUserById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.email !== decoded.email) {
      return res.status(400).json({ message: 'Token email mismatch' });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Update user
    await storage.updateUser(user.id, { emailVerified: true });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({ message: 'Invalid or expired verification token' });
  }
});

// Setup 2FA
router.post('/2fa/setup', authenticateToken, async (req: any, res: Response) => {
  try {
    const user = req.user;

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Two-factor authentication already enabled' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `SheetsApp (${user.email})`,
      issuer: 'SheetsApp',
    });

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
    }

    // Store secret temporarily (will be saved when enabled)
    await storage.updateUser(user.id, { 
      tempTwoFactorSecret: secret.base32,
    });

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes,
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Enable 2FA
router.post('/2fa/enable', authenticateToken, async (req: any, res: Response) => {
  try {
    const { token, backupCodes } = req.body;
    const user = req.user;

    if (!token) {
      return res.status(400).json({ message: 'Token required' });
    }

    if (!user.tempTwoFactorSecret) {
      return res.status(400).json({ message: 'No pending 2FA setup found' });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.tempTwoFactorSecret,
      encoding: 'base32',
      token,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid token' });
    }

    // Hash backup codes
    const hashedBackupCodes = backupCodes.map((code: string) => 
      crypto.createHash('sha256').update(code).digest('hex')
    );

    // Enable 2FA
    await storage.updateUser(user.id, {
      twoFactorEnabled: true,
      twoFactorSecret: user.tempTwoFactorSecret,
      backupCodes: hashedBackupCodes,
      tempTwoFactorSecret: null,
    });

    res.json({ message: 'Two-factor authentication enabled successfully' });
  } catch (error) {
    console.error('2FA enable error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Disable 2FA
router.post('/2fa/disable', authenticateToken, async (req: any, res: Response) => {
  try {
    const { password } = req.body;
    const user = req.user;

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: 'Two-factor authentication not enabled' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Disable 2FA
    await storage.updateUser(user.id, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      backupCodes: null,
    });

    res.json({ message: 'Two-factor authentication disabled successfully' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reset password request
router.post('/reset-password', generalLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email required' });
    }

    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user.id, type: 'reset' },
      JWT_EMAIL_SECRET,
      { expiresIn: '1h' }
    );

    await sendPasswordReset(email, resetToken);

    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password required' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid current password' });
    }

    // Validate new password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
    if (newPassword.length < 8 || !passwordRegex.test(newPassword)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character' 
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await storage.updateUser(user.id, { password: hashedPassword });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export { router as authRoutes };