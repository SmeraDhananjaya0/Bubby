import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { TrendingUp } from 'lucide-react-native';
import { Button, Card, CardHeader, Screen, Stat, StepIndicator, Txt } from '@/components';
import { sampleHistoryMiles, sampleStravaStats } from '@/data/sample';
import { colors, hues } from '@/theme/tokens';

export default function Connected() {
  const router = useRouter();
  const s = sampleStravaStats;
  const max = Math.max(...sampleHistoryMiles);
  return (
    <Screen ambient="onboarding" bottomPad={130} footer={<Button variant="cta" label="Continue" onPress={() => router.push('/(onboarding)/about-you')} />}>
      <StepIndicator step={1} />
      <View style={{ gap: 4, marginBottom: 6 }}>
        <Txt v="eyebrow">{s.runsSynced} runs synced</Txt>
        <Txt v="title">You're connected</Txt>
      </View>

      <Card style={{ paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat label="Weekly avg" value={s.weeklyAvg} unit="mi" color={hues.teal.text} size="lg" />
          <Stat label="Resting HR" value={s.restingHr} unit="bpm" color={hues.accent.text} size="lg" />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat label="Max HR" value={s.maxHr} unit="bpm" color={hues.accent.text} size="lg" />
          <Stat label="Threshold" value={s.threshold} unit="/mi" color={hues.violet.text} size="lg" />
        </View>
      </Card>

      <Card>
        <CardHeader icon={TrendingUp} title="Last 12 weeks" hue={hues.teal} meta="Miles per week" />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 150 }}>
          {sampleHistoryMiles.map((m, i) => (
            <View key={i} style={{ flex: 1, height: Math.round((m / max) * 150), borderRadius: 7, backgroundColor: i >= 9 ? hues.teal.fill : 'rgba(34, 179, 166, 0.32)' }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Txt v="micro">12 wks ago</Txt>
          <Txt v="micro" color={hues.teal.text}>Last 3 weeks · 34 mi avg</Txt>
        </View>
      </Card>

      <Txt v="bodyMuted" style={{ paddingHorizontal: 4 }}>
        Heart rate, pace and elevation from these runs shape your zones, your paces and your plan.
      </Txt>
    </Screen>
  );
}
