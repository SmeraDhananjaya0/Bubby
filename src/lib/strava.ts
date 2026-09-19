import { useEffect, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { connectStrava } from '@/data/repo';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ?? '';
export const stravaConfigured = Boolean(CLIENT_ID);

const discovery = {
  authorizationEndpoint: 'https://www.strava.com/oauth/mobile/authorize',
  tokenEndpoint: 'https://www.strava.com/oauth/token',
};

/**
 * Strava OAuth from the app. The code is exchanged server-side (edge function
 * `strava-auth`) so the client secret never ships in the bundle.
 *
 * Redirect URI: `bubbie://strava` on native, the current origin on web. Both
 * must be allowed in the Strava app's "Authorization Callback Domain".
 */
export function useStravaConnect(onConnected?: (athlete: { id: number; firstname: string }) => void) {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'bubbie', path: 'strava' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      redirectUri,
      scopes: ['read', 'activity:read_all'],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: false,
      extraParams: { approval_prompt: 'auto' },
    },
    discovery,
  );

  useEffect(() => {
    if (response?.type !== 'success' || !response.params.code) return;
    setBusy(true);
    connectStrava(response.params.code, redirectUri)
      .then((r) => onConnected?.(r.athlete))
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return { ready: !!request && stravaConfigured, busy, error, connect: () => promptAsync() };
}
