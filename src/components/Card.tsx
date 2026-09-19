import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Txt } from './Txt';
import { colors, radii, shadows, spacing, type Hue } from '@/theme/tokens';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Makes the whole card tappable (it becomes a link). */
  onPress?: () => void;
  /** Tinted background instead of white (the "Training for something?" nudge). */
  tint?: string;
  /** Colored 1px outline (suggestion cards). */
  outline?: string;
  gap?: number;
  /** Tighter bottom padding for cards that end in a list row. */
  flushBottom?: boolean;
};

/** White card, 24px radius, soft double shadow, 14px internal stack gap. */
export function Card({ children, style, onPress, tint, outline, gap = spacing.stack, flushBottom }: CardProps) {
  const base: StyleProp<ViewStyle> = [
    styles.card,
    { gap },
    tint ? { backgroundColor: tint, boxShadow: undefined } : null,
    outline ? { boxShadow: `0 0 0 1px ${outline}, 0 10px 30px rgba(27, 26, 25, 0.05)` } : null,
    flushBottom ? { paddingBottom: 6 } : null,
    style,
  ];
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.92 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

type HeaderProps = {
  icon?: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  hue: Hue;
  /** Right-side meta text ("Today", "7:00 AM"). */
  meta?: string;
  /** Right-side link ("Plan ›"). */
  link?: { label: string; onPress: () => void };
  /** Custom right slot. */
  right?: React.ReactNode;
};

/** Apple-Health-style card header: colored icon + colored title, muted meta on the right. */
export function CardHeader({ icon: Icon, title, hue, meta, link, right }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {Icon ? <Icon size={16} color={hue.text} strokeWidth={2.2} /> : null}
        <Txt v="cardTitle" color={hue.text}>
          {title}
        </Txt>
      </View>
      {right ??
        (link ? (
          <Pressable onPress={link.onPress} hitSlop={8} style={styles.link}>
            <Txt v="cardMeta">{link.label}</Txt>
            <ChevronRight size={14} color={colors.caption} strokeWidth={2.4} />
          </Pressable>
        ) : meta ? (
          <Txt v="cardMeta">{meta}</Txt>
        ) : null)}
    </View>
  );
}

/** Hairline used between list rows and above card footers. */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

/** A row that sits above a hairline (stat trios, footers). */
export function CardFooter({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingTop: spacing.cardTop,
    paddingHorizontal: spacing.cardX,
    paddingBottom: spacing.cardBottom,
    boxShadow: shadows.card,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  divider: { height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.hairline },
  footer: { paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.hairline },
});
