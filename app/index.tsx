import { Redirect } from 'expo-router';
import { useAppStore } from '@/store/useAppStore';

/** Entry: first run goes through onboarding, otherwise straight to Today. */
export default function Index() {
  const onboarded = useAppStore((s) => s.onboarded);
  return <Redirect href={onboarded ? '/(tabs)/today' : '/(onboarding)/welcome'} />;
}
