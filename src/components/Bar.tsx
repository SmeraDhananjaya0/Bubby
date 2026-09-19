import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Txt } from './Txt';
import { colors, fonts, type Hue } from '@/theme/tokens';
import { pct } from '@/lib/fuel';

type Props = {
  value: number;
  goal: number;
  hue: Hue;
  height?: number;
  /** Track uses the hue's tint instead of neutral grey. */
  tintedTrack?: boolean;
};

/** Horizontal progress bar. */
export function Bar({ value, goal, hue, height = 8, tintedTrack }: Props) {
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: tintedTrack ? hue.tint : colors.track }]}>
      <View style={{ width: `${pct(value, goal)}%`, height, borderRadius: height / 2, backgroundColor: hue.fill }} />
    </View>
  );
}

type RowProps = { name: string; value: number | string; goal: number | string; unit: string; hue: Hue; numericValue?: number; numericGoal?: number };

/** "Carbs   310 / 480 g" with a bar under it — macros and micros lists. */
export function BarRow({ name, value, goal, unit, hue, numericValue, numericGoal }: RowProps) {
  const v = numericValue ?? Number(value);
  const g = numericGoal ?? Number(goal);
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.between}>
        <Txt style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>{name}</Txt>
        <Txt v="small" style={{ color: colors.caption }}>
          <Txt style={{ fontFamily: fonts.extrabold, fontSize: 13, color: colors.ink }}>{value}</Txt>
          {` / ${goal} ${unit}`}
        </Txt>
      </View>
      <Bar value={v} goal={g} hue={hue} tintedTrack />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', width: '100%' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
