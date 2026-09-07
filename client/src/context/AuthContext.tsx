'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { AuthUser, LoginCredentials, UserRole } from '../types';
import { loginApi, getMeApi } from '../services/authApi';

// Storage keys for demo/development session management
// NOTE: For internship demo and development purposes, we use localStorage to persist tokens.
// In a full production banking environment, HTTP-Only secure cookies with CSRF tokens are recommended.
const TOKEN_KEY = 'clrms_auth_token';
const USER_KEY = 'clrms_auth_user';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => void;
  getRoleRedirectPath: (role?: UserRole) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const getRoleRedirectPath = (role?: UserRole): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'SUPERVISOR':
      return '/supervisor';
    case 'AGENT':
      return '/agent';
    case 'LEGAL_HEAD':
      return '/legal';
    default:
      return '/login';
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and verify authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (typeof window === 'undefined') return;

        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch {
              // Ignore JSON parse error and let getMeApi verify
            }
          }

          // Verify token validity with backend
          try {
            const meResponse = await getMeApi(storedToken);
            if (meResponse.data?.user) {
              setUser(meResponse.data.user);
              localStorage.setItem(USER_KEY, JSON.stringify(meResponse.data.user));
            }
          } catch (err) {
            console.warn('[Auth] Session token invalid or expired. Logging out.');
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('[Auth] Failed to initialize auth state:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login handler
  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthUser> => {
    setIsLoading(true);
    try {
      const response = await loginApi(credentials);

      if (!response.data?.token || !response.data?.user) {
        throw new Error('Invalid response structure received from authentication server');
      }

      const { token: receivedToken, user: authenticatedUser } = response.data;

      // Persist to state and storage
      setToken(receivedToken);
      setUser(authenticatedUser);

      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, receivedToken);
        localStorage.setItem(USER_KEY, JSON.stringify(authenticatedUser));
      }

      return authenticatedUser;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout handler
  // NOTE ON STATELESS JWT LOGOUT:
  // In a stateless JWT architecture, logging out clears the token and user state from the client
  // application and localStorage, terminating the local user session and protecting client routes.
  // Stateless tokens remain cryptographically valid until their expiry (JWT_EXPIRES_IN) unless a
  // centralized server-side token blocklist (e.g. Redis) is introduced in future architecture steps.
  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, []);


  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    getRoleRedirectPath,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
