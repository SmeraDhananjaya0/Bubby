import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme/tokens';

/** Onboarding progress: four 4px segments, filled up to `step`. */
export function StepIndicator({ step, total = 4 }: { step: number; total?: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.seg, { backgroundColor: i < step ? colors.accent.fill : colors.stepOff }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
});
