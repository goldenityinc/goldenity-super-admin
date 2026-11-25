import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext, type AdminUser, type AuthContextValue } from './auth-context';
import httpClient from '../lib/api/httpClient';
import {
  AUTH_EXPIRED_EVENT,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from '../lib/auth/tokenStore';

type ApiEnvelope<T> = { success?: boolean; data?: T; message?: string; error?: string };

async function fetchMe(): Promise<AdminUser> {
  const res = await httpClient.get<ApiEnvelope<{ user: AdminUser }>>('/auth/admin/me');
  const user = res.data?.data?.user;
  if (!user) throw new Error('Profil tidak ditemukan');
  return user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshClaims = useCallback(async () => {
    if (!getStoredToken()) {
      setUser(null);
      return;
    }
    try {
      setUser(await fetchMe());
    } catch {
      clearStoredToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (getStoredToken()) {
        try {
          const me = await fetchMe();
          if (!cancelled) setUser(me);
        } catch {
          clearStoredToken();
          if (!cancelled) setUser(null);
        }
      }
      if (!cancelled) setLoading(false);
    })();

    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      claims: user ? { role: user.role } : null,
      isSuperAdmin: user?.role === 'SUPER_ADMIN',
      loginWithEmail: async (email: string, password: string) => {
        const res = await httpClient.post<ApiEnvelope<{ token: string; user: AdminUser }>>('/auth/admin/login', {
          email,
          password,
        });
        const data = res.data?.data;
        if (!data?.token || !data.user) throw new Error('Respons login tidak lengkap');
        setStoredToken(data.token);
        setUser(data.user);
      },
      logout: async () => {
        clearStoredToken();
        setUser(null);
      },
      getIdToken: async () => getStoredToken(),
      refreshClaims,
    }),
    [user, loading, refreshClaims]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
