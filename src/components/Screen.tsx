import React from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ambient } from './Ambient';
import { ambients, colors, spacing } from '@/theme/tokens';

type Props = {
  ambient?: keyof typeof ambients;
  children: React.ReactNode;
  /** Pinned below the scroll area (onboarding CTAs, the coach composer). */
  footer?: React.ReactNode;
  /** Extra bottom padding for content; defaults to tab-bar clearance. */
  bottomPad?: number;
  /** Turn off scrolling for fixed layouts (Welcome). */
  scroll?: boolean;
  contentStyle?: ViewStyle;
};

/**
 * Every screen: warm ground + ambient glows + a vertical stack of cards
 * with 14px gaps and 20px side gutters. Cards never touch the edges.
 */
export function Screen({ ambient = 'today', children, footer, bottomPad, scroll = true, contentStyle }: Props) {
  const insets = useSafeAreaInsets();
  const content = [
    styles.content,
    { paddingTop: insets.top + 14, paddingBottom: bottomPad ?? spacing.tabBarClearance },
    contentStyle,
  ];
  return (
    <View style={styles.root}>
      <Ambient preset={ambient} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentInsetAdjustmentBehavior="never"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[content, { flex: 1 }]}>{children}</View>
      )}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 22) + 12 }]}>{footer}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ground },
  content: {
    paddingHorizontal: spacing.screenX,
    gap: spacing.stack,
  },
  footer: {
    position: 'absolute',
    left: spacing.screenX,
    right: spacing.screenX,
    bottom: 0,
    gap: 10,
    alignItems: 'center',
  },
});
