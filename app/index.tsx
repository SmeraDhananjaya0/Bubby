import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { colors } from '@/theme/tokens';

/**
 * Entry gate:
 *  - not signed in        → auth
 *  - signed in, new       → onboarding
 *  - signed in, onboarded → Today
 * Waits for persisted state to load first so we don't flash the wrong screen.
 */
export default function Index() {
  const authHydrated = useAuthStore((s) => s.hydrated);
  const appHydrated = useAppStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const onboarded = useAppStore((s) => s.onboarded);

  if (!authHydrated || !appHydrated) return <View style={{ flex: 1, backgroundColor: colors.ground }} />;
  if (!user) return <Redirect href="/(auth)/sign-in" />;
  return <Redirect href={onboarded ? '/(tabs)/today' : '/(onboarding)/welcome'} />;
}
