import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Txt } from './Txt';
import { colors, fonts, radii, type Hue } from '@/theme/tokens';

type Props = {
  label: string;
  hue?: Hue;
  /** Neutral grey chip when no hue is given. */
  onPress?: () => void;
  icon?: React.ReactNode;
  /** Filled white chip on a tinted panel. */
  onTint?: boolean;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  selected?: boolean;
  accessibilityLabel?: string;
};

/** Tinted pill: "Goal 3:45:00", "Long-run day", quick-add foods. */
export function Chip({ label, hue, onPress, icon, onTint, size = 'sm', style, selected, accessibilityLabel }: Props) {
  const bg = onTint ? colors.white : hue ? hue.tint : colors.field;
  const fg = onTint ? colors.ink : hue ? hue.text : colors.ink2;
  const inner = (
    <View
      style={[
        styles.chip,
        size === 'md' && styles.md,
        { backgroundColor: bg },
        selected && hue && { boxShadow: `0 0 0 2px ${hue.fill}` },
        style,
      ]}
    >
      {icon}
      <Txt style={{ fontFamily: fonts.bold, fontSize: size === 'md' ? 13 : 12, lineHeight: size === 'md' ? 18 : 16, color: fg }}>{label}</Txt>
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} hitSlop={4} style={({ pressed }) => pressed && { opacity: 0.8 }}>
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: radii.chip },
  md: { height: 38, paddingHorizontal: 12, borderRadius: 12 },
});
