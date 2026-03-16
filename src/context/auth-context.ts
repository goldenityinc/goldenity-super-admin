import { createContext } from 'react';
import type { User } from 'firebase/auth';

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  claims: Record<string, unknown> | null;
  isSuperAdmin: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refreshClaims: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);