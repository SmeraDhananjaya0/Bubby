import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Txt } from './Txt';
import { colors } from '@/theme/tokens';

type Day = {
  label: string;
  /** Foreground bar (miles done this week). */
  value: number;
  /** Ghost bar behind it (planned, or last week). 0 draws a small resting pill. */
  ghost: number;
  color: string;
  today?: boolean;
};

type Props = { days: Day[]; max: number; height?: number };

/** Seven columns: a ghost bar (plan / last week) with the actual bar over it. */
export function WeekBars({ days, max, height = 64 }: Props) {
  return (
    <View style={styles.row}>
      {days.map((d, i) => {
        const ghostH = d.ghost === 0 ? 6 : Math.round((d.ghost / max) * height);
        const valH = Math.round((d.value / max) * height);
        return (
          <View key={i} style={styles.col}>
            <View style={{ height, width: '100%' }}>
              <View style={[styles.bar, { height: ghostH, backgroundColor: colors.track }]} />
              <View style={[styles.bar, { height: valH, backgroundColor: d.color }]} />
            </View>
            <Txt v="micro" style={{ color: d.today ? colors.ink : colors.caption, letterSpacing: 0 }}>
              {d.label}
            </Txt>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderRadius: 6 },
});
