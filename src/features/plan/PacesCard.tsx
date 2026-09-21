import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Timer } from 'lucide-react-native';
import { Card, CardHeader, Txt } from '@/components';
import { describeRace, zoneRange } from '@/lib/fitness';
import { fmtPace } from '@/lib/plan';
import { colors, fonts, hues } from '@/theme/tokens';
import type { PlanPaces, RecentRace } from '@/types';

type Props = { paces: PlanPaces; reference?: RecentRace | null };

const ROWS: { label: string; key: keyof Omit<PlanPaces, 'race' | 'zones' | 'source'>; zone: string; spread: number }[] = [
  { label: 'Recovery', key: 'recovery', zone: 'Zone 1', spread: 30 },
  { label: 'Easy', key: 'easy', zone: 'Zone 2', spread: 15 },
  { label: 'Long', key: 'long', zone: 'Zone 2', spread: 15 },
  { label: 'Tempo', key: 'tempo', zone: 'Zone 3–4', spread: 0 },
  { label: 'Intervals', key: 'intervals', zone: 'Zone 4–5', spread: 0 },
];

/** The paces every session in the block is written against, with a heart-rate range when max HR is known. */
export function PacesCard({ paces, reference }: Props) {
  const meta = paces.source === 'race' && reference ? `from your ${describeRace(reference)}` : paces.source === 'history' ? 'from your Strava runs' : 'from your goal time';
  return (
    <Card gap={0}>
      <CardHeader icon={Timer} title="Your paces" hue={hues.amber} meta={meta} />
      {ROWS.map((r, i) => {
        const p = paces[r.key];
        const pace = r.spread ? `${fmtPace(p - r.spread)}–${fmtPace(p + r.spread)}` : fmtPace(p);
        const bpm = zoneRange(r.zone, paces.zones);
        return (
          <View key={r.key} style={[styles.row, i > 0 && styles.hair]}>
            <View style={{ gap: 2 }}>
              <Txt style={styles.label}>{r.label}</Txt>
              <Txt v="micro">{r.zone}</Txt>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Txt style={styles.pace}>{pace} <Txt style={styles.unit}>/mi</Txt></Txt>
              {bpm ? <Txt v="micro" color={hues.accent.text}>{bpm}</Txt> : null}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  hair: { borderTopWidth: 1, borderTopColor: colors.hairline },
  label: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  pace: { fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: -0.3, color: colors.ink },
  unit: { fontFamily: fonts.bold, fontSize: 13, color: colors.caption },
});
