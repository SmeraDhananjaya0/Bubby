import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, Link2 } from 'lucide-react-native';
import { Button, Chip, Rings, Screen, Txt } from '@/components';
import { colors, fonts, macroHue } from '@/theme/tokens';

export default function Welcome() {
  const router = useRouter();
  return (
    <Screen
      ambient="onboarding"
      scroll={false}
      contentStyle={{ paddingTop: 104, paddingBottom: 262, paddingHorizontal: 28, alignItems: 'center', justifyContent: 'space-between' }}
      footer={
        <>
          <Button
            variant="cta"
            label="Connect Strava"
            icon={<Link2 size={16} color={colors.white} strokeWidth={2.4} />}
            onPress={() => router.push('/(onboarding)/connected')}
          />
          <Button
            variant="ctaSecondary"
            label="Connect Apple Health"
            icon={<Heart size={16} color={colors.ink} strokeWidth={2.4} />}
            iconRight={<Chip label="iPhone" />}
            onPress={() => router.push('/(onboarding)/connected')}
          />
          <Txt v="caption" style={styles.center}>
            We read runs, heart rate and pace from Strava or Apple Health. Nothing is ever posted for you.
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
