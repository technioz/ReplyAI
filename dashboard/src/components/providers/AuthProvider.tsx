'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import QuirklyDashboardConfig from '@/lib/config';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  apiKey?: string;
  role?: 'user' | 'admin';
  status: 'active' | 'suspended' | 'expired';
  hasActiveSubscription?: boolean;
  credits?: {
    available: number;
    used: number;
    total: number;
    lastResetAt: string;
  };
  preferences?: {
    notifications?: {
      email: boolean;
      marketing: boolean;
    };
    defaultTone?: string;
  };
  createdAt: string;
  lastLoginAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Check localStorage for existing token
      const token = localStorage.getItem('quirkly_token');
      if (token) {
        // Validate token with authentication server
        const authUrl = QuirklyDashboardConfig.getAuthUrl();
        
        const response = await fetch(authUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            action: 'validate_session',
            token: token,
            timestamp: new Date().toISOString(),
            source: 'dashboard'
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
          } else {
            // Invalid token, remove it
            localStorage.removeItem('quirkly_token');
          }
        } else {
          // Token validation failed, remove it
          localStorage.removeItem('quirkly_token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Remove invalid token on error
      localStorage.removeItem('quirkly_token');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Call authentication API
      const authUrl = QuirklyDashboardConfig.getAuthUrl();
      
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'login',
          email: email.toLowerCase().trim(),
          password: password,
          timestamp: new Date().toISOString(),
          source: 'dashboard',
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
          ipAddress: 'client-side' // Will be detected server-side
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid email or password');
        } else if (response.status === 403) {
          throw new Error('Account suspended or expired');
        } else if (response.status === 429) {
          throw new Error('Too many login attempts. Please try again later');
        }
        throw new Error('Login failed. Please try again');
      }

      const data = await response.json();
      
      if (data.success && data.user && data.token) {
        setUser(data.user);
        localStorage.setItem('quirkly_token', data.token);
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      
      // Validate input
      if (!email || !password || !fullName) {
        throw new Error('All fields are required');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Call authentication API
      const authUrl = QuirklyDashboardConfig.getAuthUrl();
      
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          action: 'signup',
          email: email.toLowerCase().trim(),
          password: password,
          fullName: fullName.trim(),
          timestamp: new Date().toISOString(),
          source: 'dashboard',
          userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
          ipAddress: 'client-side', // Will be detected server-side
          subscriptionTier: 'free' // Default to free tier
        })
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('An account with this email already exists');
        } else if (response.status === 400) {
          throw new Error('Invalid email or password format');
        } else if (response.status === 429) {
          throw new Error('Too many signup attempts. Please try again later');
        }
        throw new Error('Signup failed. Please try again');
      }

      const data = await response.json();
      
      if (data.success && data.user && data.token) {
        setUser(data.user);
        localStorage.setItem('quirkly_token', data.token);
      } else {
        throw new Error(data.message || 'Signup failed');
      }
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('quirkly_token');
      if (token) {
        // Notify server about logout
        const authUrl = QuirklyDashboardConfig.getAuthUrl();
        
        try {
          await fetch(authUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              action: 'logout',
              token: token,
              timestamp: new Date().toISOString(),
              source: 'dashboard'
            })
          });
        } catch (error) {
          // Silent fail - logout locally even if server call fails
          console.warn('Server logout failed, continuing with local logout:', error);
        }
      }
      
      setUser(null);
      localStorage.removeItem('quirkly_token');
    } catch (error) {
      console.error('Sign out failed:', error);
      // Always clear local state even if server call fails
      setUser(null);
      localStorage.removeItem('quirkly_token');
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      await checkAuth();
    } catch (error) {
      console.error('User refresh failed:', error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
