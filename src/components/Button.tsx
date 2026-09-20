import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Txt } from './Txt';
import { colors, fonts, radii } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'cta' | 'ctaSecondary';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Fill available width in a row. */
  grow?: boolean;
  accessibilityLabel?: string;
  /** Greyed out and inert — used while a form has an invalid field. */
  disabled?: boolean;
};

/**
 * primary: ink pill (the one strong element on a card)
 * secondary: field-grey pill
 * ghost: text only
 * cta / ctaSecondary: 54px full-width, pinned at the bottom of onboarding screens
 */
export function Button({ label, onPress, variant = 'primary', icon, iconRight, style, grow, accessibilityLabel, disabled }: Props) {
  const isCta = variant === 'cta' || variant === 'ctaSecondary';
  const bg =
    variant === 'primary' || variant === 'cta'
      ? colors.ink
      : variant === 'secondary'
        ? colors.field
        : variant === 'ctaSecondary'
          ? 'rgba(255,255,255,0.88)'
          : 'transparent';
  const fg = variant === 'primary' || variant === 'cta' ? colors.white : variant === 'ghost' ? colors.accent.text : colors.ink;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        isCta ? styles.cta : styles.regular,
        { backgroundColor: bg },
        variant === 'ghost' && styles.ghost,
        variant === 'ctaSecondary' && { boxShadow: '0 1px 2px rgba(27, 26, 25, 0.06), 0 6px 20px rgba(27, 26, 25, 0.05)' },
        grow && { flexGrow: 1 },
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      {icon ? <View>{icon}</View> : null}
      <Txt style={{ fontFamily: fonts.bold, fontSize: isCta ? 16 : 15, color: fg }}>{label}</Txt>
      {iconRight ? <View>{iconRight}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  regular: { height: 46, paddingHorizontal: 18, borderRadius: radii.button },
  cta: { height: 54, width: '100%', borderRadius: radii.cta },
  ghost: { height: 40, paddingHorizontal: 12 },
});
