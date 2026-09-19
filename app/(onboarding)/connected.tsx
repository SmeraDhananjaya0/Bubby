import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TrendingUp } from 'lucide-react-native';
import { Button, Card, CardHeader, HistoryBars, Screen, Stat, StepIndicator, Txt } from '@/components';
import { loadHistory } from '@/data/repo';
import type { RunHistory } from '@/types';
import { sampleHistoryMiles, sampleStravaStats } from '@/data/sample';
import { fmtPace } from '@/lib/plan';
import { useAppStore } from '@/store/useAppStore';
import { hues } from '@/theme/tokens';

/** Sample stand-in for local mode and Apple Health (which has no sync yet). */
const SAMPLE: RunHistory = { runs: sampleStravaStats.runsSynced, weeklyMiles: sampleHistoryMiles, weeklyAvg: sampleStravaStats.weeklyAvg, longestMi: 12, maxHr: sampleStravaStats.maxHr, avgPaceSec: 8 * 60 + 40 };

export default function Connected() {
  const router = useRouter();
  const { via } = useLocalSearchParams<{ via?: string }>();
  const userId = useAppStore((s) => s.userId);
  const [history, setHistory] = useState<RunHistory | null>(userId && via !== 'health' ? null : SAMPLE);

  // Cloud mode: what the first sync just pulled. Local mode / Apple Health: the sample.
  useEffect(() => {
    if (!userId || via === 'health') return;
    let alive = true;
    loadHistory(userId).then((h) => alive && setHistory(h)).catch(() => alive && setHistory({ ...SAMPLE, runs: 0, weeklyMiles: Array(12).fill(0), weeklyAvg: 0, longestMi: 0, maxHr: null, avgPaceSec: null }));
    return () => { alive = false; };
  }, [userId, via]);

  const h = history;
  const last3 = h ? Math.round(h.weeklyMiles.slice(-3).reduce((a, b) => a + b, 0) / 3) : 0;
  const none = !!h && h.runs === 0;

  return (
    <Screen ambient="onboarding" bottomPad={130} footer={<Button variant="cta" label="Continue" onPress={() => router.push('/(onboarding)/about-you')} />}>
      <StepIndicator step={1} />
      <View style={{ gap: 4, marginBottom: 6 }}>
        <Txt v="eyebrow">{h ? `${h.runs} runs synced` : 'Syncing…'}</Txt>
        <Txt v="title">{none ? 'Connected' : "You're connected"}</Txt>
      </View>

      <Card style={{ paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat label="Weekly avg" value={h?.weeklyAvg ?? '—'} unit="mi" color={hues.teal.text} size="lg" />
          <Stat label="Longest run" value={h?.longestMi ?? '—'} unit="mi" color={hues.violet.text} size="lg" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat label="Max HR" value={h?.maxHr ?? '—'} unit="bpm" color={hues.accent.text} size="lg" />
          <Stat label="Avg pace" value={h?.avgPaceSec ? fmtPace(h.avgPaceSec) : '—'} unit="/mi" color={hues.amber.text} size="lg" />
        </View>
      </Card>

      <Card>
        <CardHeader icon={TrendingUp} title="Last 12 weeks" hue={hues.teal} meta="Miles per week" />
        <HistoryBars weeklyMiles={h?.weeklyMiles ?? Array(12).fill(0)} right={none ? 'No runs yet' : `Last 3 weeks · ${last3} mi avg`} />
      </Card>

      <Txt v="bodyMuted" style={{ paddingHorizontal: 4 }}>
        {none
          ? 'Nothing in the last 12 weeks — your plan will start from a conservative base and adjust as runs come in.'
          : 'Heart rate, pace and volume from these runs set your starting mileage, your paces and your plan.'}
      </Txt>
    </Screen>
  );
}
