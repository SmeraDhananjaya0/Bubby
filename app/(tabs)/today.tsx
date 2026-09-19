import React from 'react';
import { useRouter } from 'expo-router';
import { Avatar, Header, Screen } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { todayLabel } from '@/lib/format';
import { NoRaceNudge, RaceCard } from '@/features/today/RaceCard';
import { FuelTodayCard } from '@/features/today/FuelTodayCard';
import { WorkoutCard } from '@/features/today/WorkoutCard';
import { FuelingCard } from '@/features/today/FuelingCard';
import { PersonalBestsCard, RecoveryCard, TomorrowCard } from '@/features/today/SmallCards';
import { ProgressCard, ThisWeekCard, WeekAgainstPlanCard } from '@/features/today/StatsCards';

/**
 * Home. Two modes:
 *  - race set   → goal race hero, fuel rings, today's workout, fueling, week vs plan, tomorrow, recovery
 *  - no race    → fuel rings, this week vs last, progress trend, personal bests, recovery, add-a-race nudge
 */
export default function Today() {
  const router = useRouter();
  const hasRace = useAppStore((s) => s.hasRace);
  const week = useAppStore((s) => s.week);
  const todayIndex = useAppStore((s) => s.todayIndex);
  const todayDone = useAppStore((s) => s.todayDone);

  return (
    <Screen ambient="today">
      <Header eyebrow={todayLabel()} title="Today" right={<Avatar onPress={() => router.push('/(onboarding)/about-you')} />} />
      {hasRace ? (
        <>
          <RaceCard />
          <FuelTodayCard />
          <WorkoutCard />
          <FuelingCard />
          <WeekAgainstPlanCard week={week} todayIndex={todayIndex} todayDone={todayDone} />
          <TomorrowCard />
          <RecoveryCard />
        </>
      ) : (
        <>
          <ThisWeekCard />
          <FuelTodayCard />
          <ProgressCard />
          <NoRaceNudge />
          <PersonalBestsCard />
          <RecoveryCard />
        </>
      )}
    </Screen>
  );
}
