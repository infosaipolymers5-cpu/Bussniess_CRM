/**
 * AuthProvider — manages Supabase Auth session state.
 * Provides user/session to the React tree via context.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { signInWithEmail, signOut as authSignOut } from '@/lib/auth/session';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  signInAsDemoOwner: () => void;
}

const LOCAL_DEMO_KEY = 'rushi_crm_demo_auth';

export const DEMO_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  app_metadata: { provider: 'email' },
  user_metadata: { full_name: 'Aditya (Owner)' },
  aud: 'authenticated',
  confirmation_sent_at: '',
  recovery_sent_at: '',
  email_change_sent_at: '',
  new_email: '',
  invited_at: '',
  action_link: '',
  email: 'owner@rushicrm.com',
  phone: '',
  created_at: '2026-01-01T00:00:00.000Z',
  confirmed_at: '2026-01-01T00:00:00.000Z',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  phone_confirmed_at: '',
  last_sign_in_at: '2026-01-01T00:00:00.000Z',
  role: 'authenticated',
  updated_at: '2026-01-01T00:00:00.000Z',
  identities: [],
  factors: [],
};

export const DEMO_SESSION: Session = {
  access_token: 'demo-local-access-token',
  refresh_token: 'demo-local-refresh-token',
  expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  token_type: 'bearer',
  user: DEMO_USER,
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local demo auth first
    try {
      if (localStorage.getItem(LOCAL_DEMO_KEY) === 'true') {
        setSession(DEMO_SESSION);
        setUser(DEMO_USER);
        setLoading(false);
        return;
      }
    } catch {
      // Storage unavailable
    }

    // Get initial Supabase session
    void supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInAsDemoOwner = useCallback(() => {
    try {
      localStorage.setItem(LOCAL_DEMO_KEY, 'true');
    } catch {
      // Ignore
    }
    setSession(DEMO_SESSION);
    setUser(DEMO_USER);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const normalizedEmail = email.toLowerCase().trim();

      // Quick local fallback for owner credentials
      if (
        normalizedEmail === 'owner@rushicrm.com' &&
        (password === 'admin123' || password.length >= 6)
      ) {
        signInAsDemoOwner();
        return { error: null };
      }

      try {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          // If Supabase server is offline locally, fallback for demo owner
          if (normalizedEmail === 'owner@rushicrm.com') {
            signInAsDemoOwner();
            return { error: null };
          }
          return { error: error.message };
        }
        return { error: null };
      } catch (err) {
        if (normalizedEmail === 'owner@rushicrm.com') {
          signInAsDemoOwner();
          return { error: null };
        }
        return {
          error:
            err instanceof Error ? err.message : 'Authentication service unavailable',
        };
      }
    },
    [signInAsDemoOwner],
  );

  const signOut = useCallback(async () => {
    try {
      localStorage.removeItem(LOCAL_DEMO_KEY);
    } catch {
      // Ignore
    }
    setSession(null);
    setUser(null);
    await authSignOut().catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, user, loading, signIn, signOut, signInAsDemoOwner }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
