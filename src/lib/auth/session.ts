/**
 * Browser-safe Supabase Auth session handling.
 * Never stores service-role keys or secrets in browser code.
 */

import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../supabase';

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: AuthError | null;
}

/** Sign in with email/password */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ user: User | null; error: AuthError | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { user: data.user, error };
}

/** Sign out */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/** Get current session */
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/** Get current user */
export async function getUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
