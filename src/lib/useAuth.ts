/**
 * Cloud auth bridge.
 *
 * `useAuthStore` is the app's idea of "who is signed in" (works offline, supports guest and
 * local accounts). This file keeps it in step with Supabase Auth when the cloud is configured:
 *  - a Supabase session ⇒ a `User` with `cloudId`, and the app store's `userId` is set so
 *    every write goes through to the database;
 *  - sign-out clears both.
 *
 * Sign-in methods:
 *  - email → six-digit code (`signInWithOtp` / `verifyOtp`), no password;
 *  - Google via Supabase OAuth (PKCE) in the system browser; enable the provider in the
 *    Supabase dashboard and add `bubbie://auth` to the allowed redirect URLs.
 */
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { isCloudConfigured, supabase } from './supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import type { User } from '@/types';

WebBrowser.maybeCompleteAuthSession();

function userFromSession(s: Session): User {
  const u = s.user;
  const meta = (u.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  const email = u.email ?? '';
  return {
    id: `sb:${u.id}`,
    cloudId: u.id,
    name: meta.full_name || meta.name || (email ? email.split('@')[0] : 'Runner'),
    email,
    photo: meta.avatar_url || meta.picture,
    provider: u.app_metadata?.provider === 'google' ? 'google' : 'email',
  };
}

function applySession(session: Session | null) {
  const auth = useAuthStore.getState();
  const app = useAppStore.getState();
  if (session) {
    const user = userFromSession(session);
    if (auth.user?.id !== user.id) auth.signIn(user);
    else auth.updateUser(user);
    if (app.userId !== user.cloudId) app.setCloudUser(user.cloudId!);
  } else {
    // Only a cloud-backed account is signed out by a missing session; guests/local accounts stay.
    if (auth.user?.cloudId) auth.signOut();
    if (app.userId) app.setCloudUser(null);
  }
}

/** Mount once in the root layout. Resolves immediately in local mode. */
export function useAuth() {
  const [ready, setReady] = useState(!isCloudConfigured);

  useEffect(() => {
    if (!isCloudConfigured) return;
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return;
        applySession(data.session);
      })
      .catch(() => {})
      .finally(() => alive && setReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => applySession(s));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { ready };
}

export async function sendCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifyCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

/** Google through Supabase OAuth. Resolves once the session exists (or throws). */
export async function signInWithGoogle() {
  const redirectTo = Platform.OS === 'web' ? (typeof window !== 'undefined' ? window.location.origin : undefined) : Linking.createURL('auth');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web', queryParams: { access_type: 'offline', prompt: 'select_account' } },
  });
  if (error) throw error;
  if (Platform.OS === 'web') return; // full-page redirect; detectSessionInUrl picks it up
  if (!data?.url || !redirectTo) throw new Error('No OAuth URL returned');
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw new Error('Sign-in cancelled');
  const url = new URL(result.url);
  const code = url.searchParams.get('code');
  if (code) {
    const { error: xErr } = await supabase.auth.exchangeCodeForSession(code);
    if (xErr) throw xErr;
    return;
  }
  // Implicit-flow fallback (tokens in the fragment)
  const frag = new URLSearchParams(url.hash.replace(/^#/, ''));
  const access_token = frag.get('access_token');
  const refresh_token = frag.get('refresh_token');
  if (access_token && refresh_token) {
    const { error: sErr } = await supabase.auth.setSession({ access_token, refresh_token });
    if (sErr) throw sErr;
    return;
  }
  throw new Error('No session in redirect');
}

export async function signOutEverywhere() {
  if (isCloudConfigured) await supabase.auth.signOut().catch(() => {});
  useAppStore.getState().setCloudUser(null);
  useAuthStore.getState().signOut();
}
