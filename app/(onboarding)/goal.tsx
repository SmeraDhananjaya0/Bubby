import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Flag, Minus, Plus } from 'lucide-react-native';
import { BackButton, Button, Card, Screen, SegmentedControl, StepIndicator, Txt } from '@/components';
import { FieldError } from '@/features/onboarding/Fields';
import { FitnessCard } from '@/features/onboarding/FitnessCard';
import { useAppStore } from '@/store/useAppStore';
import { paceFor, shortDate, weeksUntil } from '@/lib/format';
import { fmtClock, projectedFinish, referenceRace } from '@/lib/fitness';
import { formatDateInput, formatTimeInput, validateGoalTime, validateRaceDate, validateRaceName } from '@/lib/validate';
import { colors, fonts, hues, shadows } from '@/theme/tokens';
import type { Race } from '@/types';

const DISTANCES: { key: Race['distance']; miles: number; goal: string }[] = [
  { key: '5K', miles: 3.1, goal: '25:00' },
  { key: '10K', miles: 6.2, goal: '52:00' },
  { key: 'Half', miles: 13.1, goal: '1:55:00' },
  { key: 'Marathon', miles: 26.2, goal: '4:00:00' },
];

/**
 * Step 3: the goal race. Also the "Add a race" / "Edit race" screen once onboarded: the same fields,
 * but Save rebuilds the plan and returns to wherever you came from. Continue is disabled until the
 * name, date and goal time all pass validation, so a bad date never reaches the plan.
 */
export default function Goal() {
  const router = useRouter();
  const { race, profile, history, onboarded, hasRace, setRace, setProfile, setHasRace, rebuildPlan } = useAppStore();
  const days = profile.runDaysPerWeek;
  const editing = onboarded;
  const ref = referenceRace(profile, history);
  const finish = race.mode === 'finish';

  // Just finishing: the "goal time" is what current fitness projects plus a 30 s/mi cushion, so the
  // rest of the app still has a time to show. Falls back to the distance default with nothing to go on.
  useEffect(() => {
    if (!finish) return;
    const t = ref ? fmtClock(projectedFinish(ref, race.distance) + 30 * race.miles) : DISTANCES.find((d) => d.key === race.distance)!.goal;
    if (t !== race.goalTime) setRace({ goalTime: t });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finish, race.distance, ref?.distanceMi, ref?.seconds]);

  const errors = useMemo(
    () => ({ name: validateRaceName(race.name), date: validateRaceDate(race.date), time: finish ? null : validateGoalTime(race.goalTime, race.miles) }),
    [race.name, race.date, race.goalTime, race.miles, finish],
  );
  const valid = !errors.name && !errors.date && !errors.time;
  const weeks = weeksUntil(race.date);

  const save = () => {
    setHasRace(true);
    if (editing) {
      rebuildPlan();
      router.canGoBack() ? router.back() : router.replace('/(tabs)/plan');
    } else router.push('/(onboarding)/plan-preview');
  };
  const noRace = () => {
    setHasRace(false);
    if (editing) {
      rebuildPlan();
      router.canGoBack() ? router.back() : router.replace('/(tabs)/today');
    } else router.push('/(onboarding)/plan-preview');
  };

  return (
    <Screen
      ambient="onboarding"
      bottomPad={130}
      footer={<Button variant="cta" label={editing ? (hasRace ? 'Save & rebuild plan' : 'Build my plan') : 'Build my plan'} disabled={!valid} onPress={save} />}
    >
      {editing ? <BackButton fallback="/(tabs)/today" /> : <StepIndicator step={3} />}
      <View style={{ gap: 4, marginBottom: 6 }}>
        <Txt v="eyebrow">{editing ? (hasRace ? 'Edit race' : 'Add a race') : 'Step 3 of 4'}</Txt>
        <Txt v="title">Your goal</Txt>
      </View>

      <View style={styles.grid} accessibilityRole="radiogroup">
        {DISTANCES.map((d) => {
          const on = race.distance === d.key;
          return (
            <Pressable
              key={d.key}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => setRace({ distance: d.key, miles: d.miles, ...(on ? {} : { goalTime: d.goal }) })}
              style={[styles.tile, on && { boxShadow: `0 0 0 2px ${hues.accent.fill}, 0 10px 30px rgba(27, 26, 25, 0.05)` }]}
            >
              <Txt v="h3" color={on ? hues.accent.text : colors.ink}>{d.key}</Txt>
              <Txt v="small" style={{ color: colors.caption }}>{d.miles} mi</Txt>
            </Pressable>
          );
        })}
      </View>

      <Card gap={0} style={{ paddingTop: 6, paddingBottom: 6 }}>
        <View style={[styles.row, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
          <Txt style={styles.label}>Race name</Txt>
          <TextInput
            value={race.name}
            onChangeText={(name) => setRace({ name })}
            placeholder="e.g. Honolulu Marathon"
            placeholderTextColor={colors.caption}
            accessibilityLabel="Race name"
            autoCapitalize="words"
            style={styles.textField}
          />
          <FieldError text={race.name ? errors.name : null} />
        </View>
        <View style={[styles.row, { flexDirection: 'column', alignItems: 'stretch', gap: 6 }]}>
          <View style={styles.between}>
            <Txt style={styles.label}>Race date</Txt>
            <TextInput
              value={race.date}
              onChangeText={(t) => setRace({ date: formatDateInput(t) })}
              accessibilityLabel="Race date, year month day"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              style={[styles.input, errors.date ? { color: hues.amber.text } : null]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.caption}
            />
          </View>
          {errors.date ? <FieldError text={errors.date} /> : <Txt v="caption" style={{ textAlign: 'right' }}>{shortDate(race.date)}{weeks ? ` · ${weeks} weeks out` : ''}</Txt>}
        </View>
        <View style={styles.row}>
          <Txt style={styles.label}>Going for</Txt>
          <SegmentedControl compact options={[{ key: 'time', label: 'A time' }, { key: 'finish', label: 'Just finish' }]} value={race.mode} onChange={(mode) => setRace({ mode })} />
        </View>
        {finish ? null : (
        <View style={[styles.row, { flexDirection: 'column', alignItems: 'stretch', gap: 6 }]}>
          <View style={styles.between}>
            <Txt style={styles.label}>Goal time</Txt>
            <TextInput
              value={race.goalTime}
              onChangeText={(t) => setRace({ goalTime: formatTimeInput(t) })}
              accessibilityLabel="Goal time"
              keyboardType="numbers-and-punctuation"
              style={[styles.input, errors.time ? { color: hues.amber.text } : null]}
              placeholder={race.miles >= 13 ? 'H:MM:SS' : 'MM:SS'}
              placeholderTextColor={colors.caption}
            />
          </View>
          <FieldError text={errors.time} />
        </View>
        )}
        <View style={[styles.row, { borderBottomWidth: 0, paddingVertical: 12 }]}>
          <Txt style={styles.label}>Run days per week</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Fewer days" onPress={() => setProfile({ runDaysPerWeek: Math.max(3, days - 1) })} style={styles.stepBtn}>
              <Minus size={14} color={colors.ink} strokeWidth={2.6} />
            </Pressable>
            <Txt style={{ width: 36, textAlign: 'center', fontFamily: fonts.extrabold, fontSize: 20 }}>{days}</Txt>
            <Pressable accessibilityRole="button" accessibilityLabel="More days" onPress={() => setProfile({ runDaysPerWeek: Math.min(7, days + 1) })} style={styles.stepBtn}>
              <Plus size={14} color={colors.ink} strokeWidth={2.6} />
            </Pressable>
          </View>
        </View>
      </Card>

      <FitnessCard profile={profile} history={history} distance={race.distance} onChange={(recentRace) => setProfile({ recentRace })} />

      <View style={styles.note}>
        <Flag size={16} color={hues.accent.text} strokeWidth={2.2} />
        <Txt style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: hues.accent.text }}>
          {valid
            ? finish
              ? `${weeks} ${weeks === 1 ? 'week' : 'weeks'} out at ${days} runs a week. Just finishing — paces come from your current fitness; expect about ${race.goalTime}.`
              : `${weeks} ${weeks === 1 ? 'week' : 'weeks'} out at ${days} runs a week. Your goal pace works out to ${paceFor(race.goalTime, race.miles)} /mi.`
            : finish
              ? 'Fill in the race name and a future date to build your plan.'
              : 'Fill in the race name, a future date and a goal time to build your plan.'}
        </Txt>
      </View>

      {editing && hasRace ? (
        <Txt v="bodyMuted" style={{ paddingHorizontal: 4 }}>
          Saving rebuilds every future day of your plan from this goal. Days you have already run stay as they are.
        </Txt>
      ) : null}

      <Button variant="ghost" label={editing && hasRace ? 'Remove this race' : "I'm not training for a race right now"} onPress={noRace} style={{ alignSelf: 'center' }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, padding: 18, borderRadius: 20, backgroundColor: colors.white, gap: 4, boxShadow: shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink2, flexShrink: 0 },
  input: { flex: 1, minWidth: 150, textAlign: 'right', fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink, padding: 0 },
  textField: { height: 44, paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.field, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.field, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: hues.accent.tint },
});
