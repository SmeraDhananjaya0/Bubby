import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Txt } from './Txt';
import { colors, fonts } from '@/theme/tokens';

/** "‹ Back" at the top of pushed screens (Settings, onboarding steps, edit flows). */
export function BackButton({ label = 'Back', onPress, fallback = '/' }: { label?: string; onPress?: () => void; fallback?: string }) {
  const router = useRouter();
  const go = () => (onPress ? onPress() : router.canGoBack() ? router.back() : router.replace(fallback as never));
  return (
    <Pressable onPress={go} style={styles.back} accessibilityRole="button" accessibilityLabel={label} hitSlop={8}>
      <ChevronLeft size={22} color={colors.ink} strokeWidth={2.4} />
      <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: -6, marginBottom: 4, alignSelf: 'flex-start', minHeight: 44 },
});
