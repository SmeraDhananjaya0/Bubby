import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

/** 42px profile circle in the header. */
export function Avatar({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Profile" hitSlop={6}>
      <LinearGradient colors={['#B7C6FF', '#BFC9F4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.circle}>
        <User size={18} color={colors.ink} strokeWidth={2.2} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(27, 26, 25, 0.08)' },
});
