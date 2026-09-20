import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Flag, Leaf, TrendingUp } from 'lucide-react-native';
import { BackButton, BlockChart, Button, Card, CardHeader, Screen, Stat, StepIndicator, Txt } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { shortDate } from '@/lib/format';
import { buildPlan, seedSummary } from '@/lib/plan';
import { colors, fonts, hues } from '@/theme/tokens';

/** Step 4: the block you're about to start. The same builder onboarding saves with, so this is the plan you actually get. */
export default function PlanPreview() {
  const router = useRouter();
  const { race, profile, hasRace, history, completeOnboarding } = useAppStore();
  const plan = useMemo(() => (hasRace ? buildPlan({ userId: 'preview', race, profile, history }) : null), [race, profile, history, hasRace]);
  const miles = plan?.periodization.map((p) => p.miles) ?? [];
  const phases = plan?.periodization.map((p) => p.phase) ?? [];
  const seed = plan ? seedSummary(plan.seed, race.distance) : null;
  const longest = plan ? Math.max(0, ...plan.sessions.filter((s) => s.type === 'long' && s.date !== race.date).map((s) => s.payload.distanceMi)) : 0;

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
      <BackButton fallback="/(onboarding)/goal" />
      <StepIndicator step={4} />
      <View style={{ gap: 4, marginBottom: 6 }}>
        <Txt v="eyebrow">{hasRace ? `${race.name || race.distance} · ${shortDate(race.date).replace(/^\w+, /, '')}` : 'No race yet'}</Txt>
        <Txt v="title">Your plan</Txt>
      </View>

      {plan ? (
        <>
          <Card style={{ paddingTop: 18 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Stat label="Weeks" value={plan.total_weeks} color={hues.sky.text} size="md" />
              <Stat label="Runs" value={profile.runDaysPerWeek} unit="/wk" color={hues.amber.text} size="md" />
              <Stat label="Peak" value={Math.max(...miles)} unit="mi" color={hues.accent.text} size="md" />
              <Stat label="Longest" value={longest} unit="mi" color={hues.violet.text} size="md" />
            </View>
          </Card>

          <Card gap={12}>
            <CardHeader icon={Flag} title="Weekly miles" hue={hues.accent} meta={`${plan.total_weeks} weeks to race day`} />
            <BlockChart miles={miles} phases={phases} height={190} showPhases />
          </Card>

          {seed ? (
            <Card gap={8}>
              <CardHeader icon={TrendingUp} title={seed.title} hue={hues.teal} />
              <Txt v="bodyMuted">{seed.body}</Txt>
            </Card>
          ) : null}
        </>
      ) : (
        <Card gap={8}>
          <CardHeader icon={Flag} title="Everyday running" hue={hues.accent} />
          <Txt v="bodyMuted">No race on the calendar, so Bubbie fuels the runs you do as they come in. Add a race any time from Today or Settings and a full block appears here.</Txt>
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: hues.green.tint }}>
        <Leaf size={16} color={hues.green.text} strokeWidth={2.2} style={{ marginTop: 1 }} />
        <Txt style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: hues.green.text }}>
          Calories start from your daily baseline and each run's cost is added on top, so a 3-mile day and a 13-mile day fuel very differently. Protein stays steady all the way through.
        </Txt>
      </View>
      <Txt v="caption" style={{ textAlign: 'center', color: colors.caption }}>You can change your race, date, goal or run days later in Settings.</Txt>
    </Screen>
  );
}
