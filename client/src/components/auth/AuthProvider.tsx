import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  username: string;
  email: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  role: 'user' | 'admin';
  subscription?: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'cancelled' | 'expired';
    expiresAt: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<any>;
  register: (credentials: RegisterCredentials) => Promise<any>;
  logout: () => Promise<void>;
  verifyEmail: (token: string) => Promise<any>;
  setupTwoFactor: () => Promise<any>;
  enableTwoFactor: (token: string, backupCodes: string[]) => Promise<any>;
  disableTwoFactor: (password: string) => Promise<any>;
  resetPassword: (email: string) => Promise<any>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<any>;
  refreshToken: () => Promise<any>;
}

interface LoginCredentials {
  email: string;
  password: string;
  twoFactorToken?: string;
  rememberMe?: boolean;
}

interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Auto refresh token
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        refreshTokenSilently();
      }, 15 * 60 * 1000); // Refresh every 15 minutes

      return () => clearInterval(interval);
    }
  }, [user]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Try to refresh token if available
        await refreshTokenSilently();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTokenSilently = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        const { accessToken, user: userData } = await response.json();
        localStorage.setItem('accessToken', accessToken);
        setUser(userData);
        return { success: true };
      } else {
        // Refresh failed, user needs to login again
        localStorage.removeItem('accessToken');
        setUser(null);
        return { success: false };
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      localStorage.removeItem('accessToken');
      setUser(null);
      return { success: false };
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresTwoFactor) {
          return { success: false, requiresTwoFactor: true, message: data.message };
        }
        throw new Error(data.message || 'Login failed');
      }

      // Store access token
      localStorage.setItem('accessToken', data.tokens.accessToken);
      setUser(data.user);

      toast({
        title: "Welcome back!",
        description: "You have been successfully logged in.",
      });

      return { success: true, user: data.user };
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      if (credentials.password !== credentials.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      toast({
        title: "Registration successful!",
        description: "Please check your email to verify your account.",
      });

      return { success: true, message: data.message };
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
      queryClient.clear();
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Email verification failed');
      }

      // Update user data
      setUser(prev => prev ? { ...prev, emailVerified: true } : null);

      toast({
        title: "Email verified!",
        description: "Your email has been successfully verified.",
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const setupTwoFactor = async () => {
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Two-factor setup failed');
      }

      return {
        success: true,
        qrCode: data.qrCode,
        secret: data.secret,
        backupCodes: data.backupCodes
      };
    } catch (error: any) {
      toast({
        title: "Setup failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const enableTwoFactor = async (token: string, backupCodes: string[]) => {
    try {
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        credentials: 'include',
        body: JSON.stringify({ token, backupCodes }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Two-factor enable failed');
      }

      setUser(prev => prev ? { ...prev, twoFactorEnabled: true } : null);

      toast({
        title: "Two-factor authentication enabled!",
        description: "Your account is now more secure.",
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Enable failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const disableTwoFactor = async (password: string) => {
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Two-factor disable failed');
      }

      setUser(prev => prev ? { ...prev, twoFactorEnabled: false } : null);

      toast({
        title: "Two-factor authentication disabled",
        description: "Two-factor authentication has been disabled for your account.",
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Disable failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Password reset failed');
      }

      toast({
        title: "Reset email sent",
        description: "Please check your email for password reset instructions.",
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Password change failed');
      }

      toast({
        title: "Password changed",
        description: "Your password has been successfully changed.",
      });

      return { success: true };
    } catch (error: any) {
      toast({
        title: "Password change failed",
        description: error.message,
        variant: "destructive",
      });
      throw error;
    }
  };

  const refreshToken = async () => {
    return await refreshTokenSilently();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    verifyEmail,
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    resetPassword,
    changePassword,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}