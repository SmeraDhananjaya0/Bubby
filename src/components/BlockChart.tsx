import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Txt } from './Txt';
import { colors } from '@/theme/tokens';

type Phase = 'base' | 'build' | 'peak' | 'taper';

type Props = {
  miles: number[];
  phases: Phase[];
  /** 1-based; highlights the current week and dims the past. When omitted, peak weeks are highlighted. */
  currentWeek?: number;
  height?: number;
  color?: string;
  /** Show the phase strip + labels under the bars. */
  showPhases?: boolean;
};

const tint = (hex: string, a: number) => {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/** Weekly-mileage silhouette of the whole training block. */
export function BlockChart({ miles, phases, currentWeek, height = 56, color = colors.accent.fill, showPhases }: Props) {
  const max = Math.max(...miles);
  const counts = phases.reduce<Record<Phase, number>>((acc, p) => ({ ...acc, [p]: acc[p] + 1 }), { base: 0, build: 0, peak: 0, taper: 0 });
  const phaseFill: Record<Phase, string> = { base: tint(color, 0.18), build: tint(color, 0.36), peak: color, taper: tint(color, 0.18) };
  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.bars, { height }]}>
        {miles.map((m, i) => {
          const wk = i + 1;
          const bg =
            currentWeek == null
              ? phaseFill[phases[i]]
              : wk < currentWeek
                ? tint(color, 0.42)
                : wk === currentWeek
                  ? color
                  : colors.trackDark;
          return <View key={i} style={{ flex: 1, height: Math.max(6, Math.round((m / max) * height)), borderRadius: height > 100 ? 7 : 4, backgroundColor: bg }} />;
        })}
      </View>
      {showPhases ? (
        <>
          <View style={styles.strip}>
            {(['base', 'build', 'peak', 'taper'] as Phase[]).map((p) => (
              <View key={p} style={{ flexGrow: counts[p], flexBasis: 0, height: 5, borderRadius: 3, backgroundColor: phaseFill[p] }} />
            ))}
          </View>
          <View style={styles.strip}>
            {(['base', 'build', 'peak', 'taper'] as Phase[]).map((p) => (
              <Txt key={p} v="micro" style={{ flexGrow: counts[p], flexBasis: 0, color: p === 'peak' ? colors.accent.text : colors.caption }}>
                {p}
              </Txt>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  strip: { flexDirection: 'row', gap: 6 },
});
