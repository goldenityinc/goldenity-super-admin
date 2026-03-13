import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import type { IdTokenResult, User } from 'firebase/auth';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { auth } from '../lib/firebase/firebaseClient';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  claims: Record<string, unknown> | null;
  isSuperAdmin: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  refreshClaims: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);

  const extractClaims = (tokenResult: IdTokenResult | null) => {
    if (!tokenResult) {
      return null;
    }

    return tokenResult.claims as Record<string, unknown>;
  };

  const refreshClaims = async () => {
    if (!auth.currentUser) {
      setClaims(null);
      return;
    }

    const tokenResult = await auth.currentUser.getIdTokenResult(true);
    setClaims(extractClaims(tokenResult));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        setClaims(extractClaims(tokenResult));
      } else {
        setClaims(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      claims,
      isSuperAdmin:
        claims?.role === 'SUPER_ADMIN' ||
        claims?.superAdmin === true ||
        claims?.super_admin === true,
      loginWithEmail: async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
      },
      logout: async () => {
        await signOut(auth);
      },
      getIdToken: async () => {
        if (!auth.currentUser) {
          return null;
        }

        return auth.currentUser.getIdToken();
      },
      refreshClaims,
    }),
    [user, loading, claims]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
