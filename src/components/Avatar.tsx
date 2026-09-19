import React from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User } from 'lucide-react-native';
import { Txt } from './Txt';
import { colors, fonts } from '@/theme/tokens';

/** 42px profile circle in the header — shows a photo, initials, or a fallback icon. */
export function Avatar({ onPress, name, photo }: { onPress?: () => void; name?: string; photo?: string }) {
  const initial = name?.trim()?.[0]?.toUpperCase();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Profile and settings" hitSlop={6}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.circle} accessibilityIgnoresInvertColors />
      ) : (
        <LinearGradient colors={['#B7C6FF', '#BFC9F4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.circle}>
          {initial ? (
            <Txt style={{ fontFamily: fonts.extrabold, fontSize: 17, color: colors.ink }}>{initial}</Txt>
          ) : (
            <User size={18} color={colors.ink} strokeWidth={2.2} />
          )}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(27, 26, 25, 0.08)' },
});
