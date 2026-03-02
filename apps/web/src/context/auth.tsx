'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { AuthResponse, AuthUser } from '@fixfirst/shared-types';
import { publicFetch } from '../lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef<string | null>(null);
  const router = useRouter();

  const getAccessToken = useCallback(() => tokenRef.current, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const data = await publicFetch<{ accessToken: string }>('/auth/refresh', { method: 'POST' });
      tokenRef.current = data.accessToken;

      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
      const profileRes = await fetch(`${API_BASE}/users/me`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
        credentials: 'include',
      });
      if (profileRes.ok) {
        setUser(await profileRes.json());
      }
      return data.accessToken;
    } catch {
      tokenRef.current = null;
      setUser(null);
      return null;
    }
  }, []);

  // Restore session on mount via httpOnly refresh token cookie
  useEffect(() => {
    refreshAccessToken().finally(() => setIsLoading(false));
  }, [refreshAccessToken]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await publicFetch<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      tokenRef.current = data.accessToken;
      setUser(data.user);
      router.push('/dashboard');
    },
    [router],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const data = await publicFetch<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      tokenRef.current = data.accessToken;
      setUser(data.user);
      router.push('/dashboard');
    },
    [router],
  );

  const logout = useCallback(async () => {
    await publicFetch('/auth/logout', { method: 'POST' }).catch(() => null);
    tokenRef.current = null;
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, getAccessToken, refreshAccessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
