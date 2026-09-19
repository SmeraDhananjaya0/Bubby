import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, Link2 } from 'lucide-react-native';
import { Button, Chip, Rings, Screen, Txt } from '@/components';
import { colors, fonts, macroHue } from '@/theme/tokens';
import { useStravaConnect } from '@/lib/strava';
import { useAuthStore } from '@/store/useAuthStore';
import { healthStatus, requestHealthAccess } from '@/lib/health';

export default function Welcome() {
  const router = useRouter();
  const strava = useStravaConnect(() => router.push('/(onboarding)/connected'));
  // Strava tokens live on a cloud account (integration_tokens), so guests can't connect.
  const cloudId = useAuthStore((s) => s.user?.cloudId);
  const [healthNote, setHealthNote] = React.useState<string | null>(null);
  const connectHealth = async () => {
    const status = await healthStatus();
    if (status === 'ready' && (await requestHealthAccess())) return router.push({ pathname: '/(onboarding)/connected', params: { via: 'health' } });
    if (Platform.OS === 'ios') setHealthNote('Apple Health needs the native build (see src/lib/health.ts). Continuing without it for now.');
    else setHealthNote('Apple Health is available in the iPhone app. Continuing without it for now.');
    router.push('/(onboarding)/connected');
  };
  return (
    <Screen
      ambient="onboarding"
      scroll={false}
      contentStyle={{ paddingTop: 104, paddingBottom: 262, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'space-between' }}
      footer={
        <>
          <Button
            variant="cta"
            label={!cloudId ? 'Sign in to connect Strava' : strava.busy ? 'Connecting…' : 'Connect Strava'}
            icon={<Link2 size={16} color={colors.white} strokeWidth={2.4} />}
            onPress={() => (!cloudId ? router.push('/(auth)/sign-in') : strava.ready ? strava.connect() : router.push('/(onboarding)/connected'))}
          />
          {Platform.OS !== 'web' ? (
            <Button
              variant="ctaSecondary"
              label="Connect Apple Health"
              icon={<Heart size={16} color={colors.ink} strokeWidth={2.4} />}
              iconRight={<Chip label="iPhone" />}
              onPress={connectHealth}
            />
          ) : null}
          <Txt v="caption" style={styles.center}>
            {strava.error ?? healthNote ?? (!cloudId
              ? 'Strava links to an account so your runs follow you between devices. Guests can skip this step.'
              : Platform.OS === 'web'
                ? 'We read runs, heart rate and pace from Strava. Nothing is ever posted for you. Apple Health comes with the iPhone app.'
                : 'We read runs, heart rate and pace from Strava or Apple Health. Nothing is ever posted for you.')}
          </Txt>
          <Button variant="ghost" label="Skip for now" onPress={() => router.push('/(onboarding)/about-you')} style={{ marginTop: -4 }} />
        </>
      }
    >
      <Rings
        size={224}
        stroke={18}
        gap={8}
        rings={[
          { pct: 0.78, color: macroHue.calories.fill, track: macroHue.calories.tint },
          { pct: 0.62, color: macroHue.carbs.fill, track: macroHue.carbs.tint },
          { pct: 0.7, color: macroHue.protein.fill, track: macroHue.protein.tint },
        ]}
      />
      <View style={{ alignItems: 'center', gap: 14 }}>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Txt style={styles.h1}>Train for it.</Txt>
          <Txt style={styles.h1Serif}>Eat for it.</Txt>
        </View>
        <Txt style={[styles.center, { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink2, maxWidth: 280 }]}>
          Fuel that adjusts to every run you do.
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: fonts.extrabold, fontSize: 44, lineHeight: 48, letterSpacing: -1.3, color: colors.ink },
  h1Serif: { fontFamily: fonts.serifItalic, fontSize: 48, lineHeight: 50, letterSpacing: -0.5, color: colors.accent.text },
  center: { textAlign: 'center' },
});
