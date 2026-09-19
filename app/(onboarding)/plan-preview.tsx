import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Flag, Leaf } from 'lucide-react-native';
import { BlockChart, Button, Card, CardHeader, Screen, Stat, StepIndicator, Txt } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { shortDate } from '@/lib/format';
import { buildPlan } from '@/lib/plan';
import { fonts, hues } from '@/theme/tokens';

export default function PlanPreview() {
  const router = useRouter();
  const { race, profile, completeOnboarding } = useAppStore();
  // The same builder onboarding saves with, so the preview shows the plan you actually get.
  const plan = useMemo(() => buildPlan({ userId: 'preview', race, profile }), [race, profile]);
  const miles = plan.periodization.map((p) => p.miles);
  const phases = plan.periodization.map((p) => p.phase);
  return (
    <Screen
      ambient="onboarding"
      bottomPad={130}
      footer={
        <Button
          variant="cta"
          label="Start training"
          onPress={() => {
            completeOnboarding();
            router.replace('/(tabs)/today');
          }}
        />
      }
    >
      <StepIndicator step={4} />
      <View style={{ gap: 4, marginBottom: 6 }}>
        <Txt v="eyebrow">
          {race.distance} · {shortDate(race.date).replace(/^\w+, /, '')}
        </Txt>
        <Txt v="title">Your plan</Txt>
      </View>

      <Card style={{ paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat label="Weeks" value={plan.total_weeks} color={hues.sky.text} size="md" />
          <Stat label="Runs" value={profile.runDaysPerWeek} unit="/wk" color={hues.amber.text} size="md" />
          <Stat label="Peak" value={Math.max(...miles)} unit="mi" color={hues.accent.text} size="md" />
        </View>
      </Card>

      <Card gap={12}>
        <CardHeader icon={Flag} title="Weekly miles" hue={hues.accent} meta={`${plan.total_weeks} weeks to race day`} />
        <BlockChart miles={miles} phases={phases} height={190} showPhases />
      </Card>

      <View style={{ flexDirection: 'row', gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: hues.green.tint }}>
        <Leaf size={16} color={hues.green.text} strokeWidth={2.2} style={{ marginTop: 1 }} />
        <Txt style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: '#14532D' }}>
          Calories and carbs rise on big days and ease off on rest days. Protein stays steady all the way through.
        </Txt>
      </View>
    </Screen>
  );
}
