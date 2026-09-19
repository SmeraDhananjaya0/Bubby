import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Txt } from './Txt';
import { colors, fonts } from '@/theme/tokens';

type Props = {
  label: string;
  value: string | number;
  unit?: string;
  /** Value color (a hue's text). */
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  /** Boxed variant on the tinted inner background. */
  boxed?: boolean;
};

const sizes = { sm: 17, md: 26, lg: 32 } as const;
const lines = { sm: 22, md: 28, lg: 34 } as const;

/** Label over a big number with a small unit: "Runs 4 of 6", "Weekly avg 28 mi". */
export function Stat({ label, value, unit, color = colors.ink, size = 'sm', style, boxed }: Props) {
  return (
    <View style={[styles.stat, boxed && styles.boxed, style]}>
      <Txt v="captionBold" style={{ fontSize: size === 'sm' ? 12 : 13 }}>
        {label}
      </Txt>
      <View style={styles.row}>
        <Txt style={{ fontFamily: fonts.extrabold, fontSize: sizes[size], lineHeight: lines[size], letterSpacing: -sizes[size] * 0.03, color }}>
          {value}
        </Txt>
        {unit ? <Txt v="captionBold" style={{ fontSize: 13 }}>{unit}</Txt> : null}
      </View>
    </View>
  );
}

/** Three (or two) stats over a hairline — the card footer pattern. */
export function StatRow({ children, columns = 3 }: { children: React.ReactNode; columns?: number }) {
  return <View style={[styles.grid, { gap: columns === 3 ? 8 : 12 }]}>{children}</View>;
}

const styles = StyleSheet.create({
  stat: { gap: 2, flex: 1 },
  boxed: { padding: 12, borderRadius: 16, backgroundColor: colors.tint },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  grid: { flexDirection: 'row' },
});
