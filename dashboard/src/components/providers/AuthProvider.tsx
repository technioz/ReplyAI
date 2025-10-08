'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import QuirklyDashboardConfig from '@/lib/config';

// Add TypeScript declaration for requestIdleCallback
declare global {
  interface Window {
    requestIdleCallback: (
      callback: IdleRequestCallback,
      opts?: IdleRequestOptions
    ) => number;
  }
}

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
  const [error, setError] = useState<Error | null>(null);

  // Error boundary for hydration issues
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error && (
        event.error.message.includes('hydration') ||
        event.error.message.includes('Grammarly') ||
        event.error.message.includes('data-new-gr-c-s-check-loaded') ||
        event.error.message.includes('data-gr-ext-installed')
      )) {
        console.log('🛡️ Caught hydration error, attempting recovery:', event.error.message);
        setError(event.error);
        
        // Try to recover by re-running auth check
        setTimeout(() => {
          setError(null);
          checkAuth();
        }, 1000);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  useEffect(() => {
    // Wait for DOM to be fully hydrated before checking auth
    const checkAuthAfterHydration = () => {
      // Check for existing session
      checkAuth();
      
      // Handle Grammarly extension attributes to prevent hydration errors
      const handleGrammarlyAttributes = () => {
        const body = document.body;
        if (body) {
          // Remove Grammarly attributes that cause hydration mismatches
          body.removeAttribute('data-new-gr-c-s-check-loaded');
          body.removeAttribute('data-gr-ext-installed');
        }
      };
      
      // Run immediately and also on DOM changes
      handleGrammarlyAttributes();
      
      // Use MutationObserver to watch for Grammarly attributes being added
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && 
              (mutation.attributeName === 'data-new-gr-c-s-check-loaded' || 
               mutation.attributeName === 'data-gr-ext-installed')) {
            handleGrammarlyAttributes();
          }
        });
      });
      
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['data-new-gr-c-s-check-loaded', 'data-gr-ext-installed']
      });
      
      // Cleanup observer on unmount
      return () => observer.disconnect();
    };
    
    // Check if we're in the browser and DOM is ready
    if (typeof window !== 'undefined') {
      // Use requestIdleCallback for better performance, fallback to setTimeout
      if (window.requestIdleCallback) {
        window.requestIdleCallback(checkAuthAfterHydration);
      } else {
        setTimeout(checkAuthAfterHydration, 100);
      }
    }
  }, []);

  const checkAuth = async (retryCount = 0) => {
    try {
      // Check localStorage for existing token
      const token = localStorage.getItem('quirkly_token');
      console.log('🔍 Checking auth, token exists:', !!token, 'retry:', retryCount);
      console.log('🔍 Token length:', token ? token.length : 0);
      console.log('🔍 Token preview:', token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : 'none');
      
      if (token) {
        // Validate token by calling the /api/auth/me endpoint
        const response = await fetch(`${QuirklyDashboardConfig.getApiBaseUrl()}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('🔍 Auth check response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🔍 Auth check response data:', data);
          
          if (data.success && data.user) {
            console.log('✅ User authenticated:', data.user.email);
            setUser(data.user);
          } else {
            console.log('❌ Auth failed - no user data');
            // Invalid token, remove it
            localStorage.removeItem('quirkly_token');
          }
        } else {
          console.log('❌ Auth failed - response not ok');
          // Token validation failed, remove it
          localStorage.removeItem('quirkly_token');
        }
      } else {
        console.log('🔍 No token found in localStorage');
      }
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      
      // Retry logic for hydration-related issues
      if (retryCount < 2 && (
        error instanceof TypeError && error.message.includes('fetch') ||
        error.message.includes('hydration') ||
        error.message.includes('Grammarly')
      )) {
        console.log(`🔄 Retrying auth check (${retryCount + 1}/2) due to:`, error.message);
        // Wait a bit before retrying
        setTimeout(() => checkAuth(retryCount + 1), 1000);
        return;
      }
      
      // Don't remove token on network errors, only on validation errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.log('🔍 Network error, keeping token for retry');
      } else {
        localStorage.removeItem('quirkly_token');
      }
    } finally {
      if (retryCount === 0) {
        setLoading(false);
      }
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

      // Split full name into first and last name
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Call SIGNUP API (not login API)
      const signupUrl = QuirklyDashboardConfig.getApiBaseUrl() + '/auth/signup';
      
      const response = await fetch(signupUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password,
          firstName: firstName,
          lastName: lastName
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
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshUser }}>
      {error && (
        <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50">
          <div className="flex items-center space-x-2">
            <span className="text-sm">🔄 Recovering from error...</span>
            <button 
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              ×
            </button>
          </div>
        </div>
      )}
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
