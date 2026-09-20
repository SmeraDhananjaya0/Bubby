import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Tabs } from 'expo-router';
import { FloatingTabBar } from '@/components';
import { useStravaAutoSync } from '@/lib/strava';
import { useAppStore } from '@/store/useAppStore';

/** Keeps "today" honest: re-cut the week from the plan whenever the app opens or comes back. */
function usePlanClock() {
  const syncToday = useAppStore((s) => s.syncToday);
  const hydrated = useAppStore((s) => s.hydrated);
  const cloudReady = useAppStore((s) => s.cloudReady);
  useEffect(() => {
    syncToday();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') syncToday(); });
    return () => sub.remove();
  }, [syncToday, hydrated, cloudReady]);
}

export default function TabsLayout() {
  useStravaAutoSync();
  usePlanClock();
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: 'transparent' } }}
      backBehavior="history"
    >
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
      <Tabs.Screen name="log" options={{ title: 'Log' }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach' }} />
    </Tabs>
  );
}
