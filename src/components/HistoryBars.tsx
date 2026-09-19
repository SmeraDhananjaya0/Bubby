import React from 'react';
import { View } from 'react-native';
import { Txt } from './Txt';
import { hues } from '@/theme/tokens';

type Props = {
  /** Miles per week, oldest first. */
  weeklyMiles: number[];
  height?: number;
  /** Caption under the right edge, e.g. "Last 3 weeks · 34 mi avg". */
  right?: string;
};

/** Weekly mileage bars; the last three weeks are highlighted. */
export function HistoryBars({ weeklyMiles, height = 150, right }: Props) {
  const max = Math.max(1, ...weeklyMiles);
  const n = weeklyMiles.length;
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height }}>
        {weeklyMiles.map((m, i) => (
          <View key={i} style={{ flex: 1, height: Math.max(3, Math.round((m / max) * height)), borderRadius: 7, backgroundColor: i >= n - 3 ? hues.teal.fill : hues.teal.tint }} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt v="micro">{n} wks ago</Txt>
        {right ? <Txt v="micro" color={hues.teal.text}>{right}</Txt> : null}
      </View>
    </>
  );
}
