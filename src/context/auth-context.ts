import { createContext } from 'react';

/** Profil Super Admin dari backend (GET /auth/admin/me). */
export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
};

export type AuthContextValue = {
  user: AdminUser | null;
  loading: boolean;
  claims: Record<string, unknown> | null;
  isSuperAdmin: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refreshClaims: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
