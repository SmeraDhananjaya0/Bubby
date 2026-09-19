/**
 * Google sign-in, wired through expo-auth-session.
 *
 * To turn on real Google OAuth, create OAuth client IDs in the Google Cloud
 * console (https://console.cloud.google.com/apis/credentials) and paste them
 * into `app.json → expo.extra.google`. Until at least one is set, the sign-in
 * screen falls back to a local account so the rest of the app is usable now.
 *
 * The redirect URI to register is `bubbie://` (native) or your dev URL (web) —
 * expo-auth-session prints the exact value; use `makeRedirectUri` if you need it.
 */
import { useEffect } from 'react';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import type { User } from '@/types';

// Completes the auth session when the browser redirects back to the app.
WebBrowser.maybeCompleteAuthSession();

type GoogleConfig = {
  expoClientId?: string;
  iosClientId?: string;
  androidClientId?: string;
  webClientId?: string;
};

const cfg = ((Constants.expoConfig?.extra as { google?: GoogleConfig } | undefined)?.google ?? {}) as GoogleConfig;

/** True once at least one OAuth client ID has been filled in. */
export const googleConfigured = Object.values(cfg).some((v) => !!v && v.length > 0);

type GoogleUserInfo = { id: string; name?: string; email?: string; picture?: string };

async function fetchProfile(accessToken: string): Promise<User> {
  const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const info = (await res.json()) as GoogleUserInfo;
  return {
    id: `google:${info.id}`,
    name: info.name ?? info.email?.split('@')[0] ?? 'Runner',
    email: info.email ?? '',
    photo: info.picture,
    provider: 'google',
  };
}

/**
 * Hook that exposes a `promptAsync()` to start the Google flow and invokes
 * `onUser` with the resolved profile. Returns `ready` (the request is prepared)
 * and `available` (client IDs are configured).
 */
export function useGoogleAuth(onUser: (user: User) => void) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: cfg.expoClientId || cfg.webClientId,
    iosClientId: cfg.iosClientId,
    androidClientId: cfg.androidClientId,
    webClientId: cfg.webClientId,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const token = response.authentication?.accessToken;
    if (!token) return;
    fetchProfile(token).then(onUser).catch(() => {});
  }, [response, onUser]);

  return {
    available: googleConfigured,
    ready: !!request,
    signIn: () => promptAsync(),
  };
}
