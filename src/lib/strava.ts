import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { AppState } from 'react-native';
import { connectStrava, syncStrava } from '@/data/repo';
import { isCloudConfigured } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ?? '';
export const stravaConfigured = Boolean(CLIENT_ID);
const SCOPES = ['read', 'activity:read_all'];
const STATE_KEY = 'bubbie:strava-state';

const discovery = {
  authorizationEndpoint: 'https://www.strava.com/oauth/mobile/authorize',
  tokenEndpoint: 'https://www.strava.com/oauth/token',
};

type Athlete = { id: number; firstname: string };

/**
 * Where Strava sends the user back: `bubbie://strava` on native, `<origin>/strava`
 * (the `app/strava.tsx` route) on web. Strava allows ONE "Authorization Callback
 * Domain" per API app, so it must be the web domain — the native build will need
 * to claim the same https URL (universal link) rather than a custom scheme.
 */
export function stravaRedirectUri() {
  if (Platform.OS === 'web') return `${window.location.origin}/strava`;
  return AuthSession.makeRedirectUri({ scheme: 'bubbie', path: 'strava' });
}

/**
 * Web uses a full-page redirect, not a popup: a popup can't hand its result back
 * to a home-screen (standalone) PWA on iOS. We leave for strava.com, it sends the
 * browser back to /strava with a code, and that route finishes the exchange.
 */
function startWebRedirect() {
  const state = crypto.randomUUID();
  localStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: stravaRedirectUri(),
    response_type: 'code',
    approval_prompt: 'auto',
    scope: SCOPES.join(','),
    state,
  });
  window.location.assign(`https://www.strava.com/oauth/authorize?${params.toString()}`);
}

/** After a connect: pull the last 90 days, then re-read the cloud so the screens show the runs. A failed pull just waits for the next sync. */
async function firstSync() {
  await syncStrava().catch(() => {});
  await useAppStore.getState().hydrateFromCloud();
}

let lastAutoSync = 0;
/**
 * Pull new runs whenever the app opens or comes back to the foreground, at most every
 * 10 minutes. Mount once in the tabs layout. Not connected (409) is a normal outcome.
 */
export function useStravaAutoSync() {
  const userId = useAppStore((s) => s.userId);
  useEffect(() => {
    if (!userId || !isCloudConfigured) return;
    const run = () => {
      if (Date.now() - lastAutoSync < 10 * 60_000) return;
      lastAutoSync = Date.now();
      syncStrava().then(() => useAppStore.getState().hydrateFromCloud()).catch(() => {});
    };
    run();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') run(); });
    return () => sub.remove();
  }, [userId]);
}

/**
 * Web only — called by `app/strava.tsx` with the code Strava sent back.
 * Rejects when the `state` doesn't match the one we left with (stale or forged link).
 */
export async function finishStravaConnect(code: string, state: string | null): Promise<Athlete> {
  const expected = localStorage.getItem(STATE_KEY);
  localStorage.removeItem(STATE_KEY);
  if (!expected || state !== expected) throw new Error('That Strava link has expired. Please try connecting again.');
  const r = await connectStrava(code, stravaRedirectUri());
  await firstSync();
  return r.athlete;
}

/**
 * Strava OAuth from the app. The code is exchanged server-side (edge function
 * `strava-auth`) so the client secret never ships in the bundle.
 */
export function useStravaConnect(onConnected?: (athlete: Athlete) => void) {
  const redirectUri = stravaRedirectUri();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      redirectUri,
      scopes: SCOPES,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: false,
      extraParams: { approval_prompt: 'auto' },
    },
    discovery,
  );

  // Native: the auth session hands the code straight back here.
  useEffect(() => {
    if (response?.type !== 'success' || !response.params.code) return;
    setBusy(true);
    connectStrava(response.params.code, redirectUri)
      .then(async (r) => { await firstSync(); onConnected?.(r.athlete); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const connect = () => { if (Platform.OS === 'web') startWebRedirect(); else void promptAsync(); };
  const ready = stravaConfigured && (Platform.OS === 'web' || !!request);
  return { ready, busy, error, connect };
}
