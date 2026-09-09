import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { authApi } from '../api/auth';
import type { LoginCredentials, SignupCredentials } from '../api/auth';
import { setAccessToken as setGlobalAccessToken, setOnAuthFailed } from '../api/client';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginCredentials) => Promise<void>;
  signup: (data: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // In-memory token storage (NOT in localStorage)
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  // isLoading is true initially while we attempt a silent refresh on page load
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const updateAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    setGlobalAccessToken(token);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if network fails, proceed with client state cleanup
    } finally {
      updateAccessToken(null);
      setUser(null);
    }
  }, [updateAccessToken]);

  // Hook into client 401 refresh failures
  useEffect(() => {
    setOnAuthFailed(() => {
      updateAccessToken(null);
      setUser(null);
    });
  }, [updateAccessToken]);

  // Initial silent refresh on app mount:
  // Since accessToken is held in memory, a browser refresh (F5) clears React state.
  // We check if an httpOnly refresh cookie is present by attempting /auth/refresh.
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const response = await authApi.refresh();
        if (isMounted && response.accessToken) {
          updateAccessToken(response.accessToken);
        }
      } catch {
        // No valid session cookie found or refresh token expired
        if (isMounted) {
          updateAccessToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [updateAccessToken]);

  const login = async (data: LoginCredentials) => {
    const res = await authApi.login(data);
    updateAccessToken(res.accessToken);
    setUser(res.user);
  };

  const signup = async (data: SignupCredentials) => {
    await authApi.signup(data);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!accessToken,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
