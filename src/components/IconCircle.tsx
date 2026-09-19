import React from 'react';
import { View } from 'react-native';
import type { Hue } from '@/theme/tokens';

type Props = {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  hue: Hue;
  size?: number;
  iconSize?: number;
  strokeWidth?: number;
};

/** Tinted circle with a hue-colored icon (list rows, pipeline tiles, check marks). */
export function IconCircle({ icon: Icon, hue, size = 40, iconSize = 18, strokeWidth = 2.2 }: Props) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: hue.tint, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={iconSize} color={hue.text} strokeWidth={strokeWidth} />
    </View>
  );
}
