import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import type { IdTokenResult, User } from 'firebase/auth';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from './auth-context';
import { auth } from '../lib/firebase/firebaseClient';

function extractClaims(tokenResult: IdTokenResult | null) {
  if (!tokenResult) {
    return null;
  }

  return tokenResult.claims as Record<string, unknown>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);

  const refreshClaims = useCallback(async () => {
    if (!auth.currentUser) {
      setClaims(null);
      return;
    }

    const tokenResult = await auth.currentUser.getIdTokenResult(true);
    setClaims(extractClaims(tokenResult));
  }, []);

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
    [user, loading, claims, refreshClaims]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
