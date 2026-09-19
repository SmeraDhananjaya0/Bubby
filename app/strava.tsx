import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Screen, Txt } from '@/components';
import { finishStravaConnect } from '@/lib/strava';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Where Strava sends the browser back after the user approves (web only — on
 * native the auth session returns the code without a page load). Finishes the
 * token exchange, then continues onboarding or returns to Today.
 */
export default function StravaCallback() {
  const router = useRouter();
  const { code, state, error: denied } = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const authHydrated = useAuthStore((s) => s.hydrated);
  const cloudId = useAuthStore((s) => s.user?.cloudId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !cloudId) return;
    if (denied || !code) {
      setError(denied === 'access_denied' ? 'You declined access on Strava — nothing was connected.' : 'Strava didn’t send a code back.');
      return;
    }
    finishStravaConnect(code, state ?? null)
      .then(() => router.replace(useAppStore.getState().onboarded ? '/(tabs)/today' : '/(onboarding)/connected'))
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudId, code, state, denied]);

  // Native handles the code inside useStravaConnect; guests and signed-out users can't connect.
  if (authHydrated && (Platform.OS !== 'web' || !cloudId)) return <Redirect href="/" />;

  return (
    <Screen ambient="onboarding" scroll={false} contentStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 28 }}>
      <Txt v="eyebrow">Strava</Txt>
      <Txt v="title" style={{ textAlign: 'center' }}>{error ? 'Couldn’t connect' : 'Connecting…'}</Txt>
      <Txt v="bodyMuted" style={{ textAlign: 'center' }}>{error ?? 'Saving your Strava link and pulling your recent runs.'}</Txt>
      {error ? <Button label="Back to Bubbie" onPress={() => router.replace('/')} style={{ marginTop: 8 }} /> : null}
    </Screen>
  );
}
