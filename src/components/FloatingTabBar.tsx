import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Calendar, MessageSquare, Plus, Sun, Utensils } from 'lucide-react-native';
import { Txt } from './Txt';
import { colors, fonts, hues, radii, shadows, spacing, type Hue } from '@/theme/tokens';

const TABS: Record<string, { label: string; icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>; hue: Hue }> = {
  today: { label: 'Today', icon: Sun, hue: hues.accent },
  plan: { label: 'Plan', icon: Calendar, hue: hues.violet },
  log: { label: 'Log', icon: Utensils, hue: hues.green },
  coach: { label: 'Coach', icon: MessageSquare, hue: hues.teal },
};

/**
 * The floating pill tab bar + quick-add circle. Frosted white over the ambient
 * background; the active tab gets a tinted capsule in its section hue.
 */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 22) }]}>
      <BlurView intensity={28} tint="light" style={[styles.glass, styles.pill]}>
        <View style={styles.pillInner} accessibilityRole="tablist">
          {state.routes.map((route, index) => {
            const tab = TABS[route.name];
            if (!tab) return null;
            const focused = state.index === index;
            const Icon = tab.icon;
            const color = focused ? tab.hue.text : colors.caption;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={tab.label}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                style={[styles.tab, focused && { backgroundColor: tab.hue.tint }]}
              >
                <Icon size={20} color={color} strokeWidth={2.2} />
                <Txt style={{ fontFamily: fonts.bold, fontSize: 11, color }}>{tab.label}</Txt>
              </Pressable>
            );
          })}
        </View>
      </BlurView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log a meal"
        onPress={() => router.push({ pathname: '/(tabs)/log', params: { add: '1' } })}
        style={({ pressed }) => pressed && { opacity: 0.85 }}
      >
        <BlurView intensity={28} tint="light" style={[styles.glass, styles.plus]}>
          <Plus size={24} color={colors.ink} strokeWidth={2.4} />
        </BlurView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.screenX,
    right: spacing.screenX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    overflow: 'hidden',
    boxShadow: shadows.float,
  },
  pill: { flex: 1, height: 64, borderRadius: radii.tabBar },
  pillInner: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 6, gap: 2 },
  tab: { flex: 1, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', gap: 3 },
  plus: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
