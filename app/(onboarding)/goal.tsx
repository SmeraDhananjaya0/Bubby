import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Flag, Minus, Plus } from 'lucide-react-native';
import { Button, Card, Screen, StepIndicator, Txt } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { paceFor, weeksUntil } from '@/lib/format';
import { colors, fonts, hues, shadows } from '@/theme/tokens';
import type { Race } from '@/types';

const DISTANCES: { key: Race['distance']; miles: number; goal: string }[] = [
  { key: '5K', miles: 3.1, goal: '22:30' },
  { key: '10K', miles: 6.2, goal: '47:00' },
  { key: 'Half', miles: 13.1, goal: '1:45:00' },
  { key: 'Marathon', miles: 26.2, goal: '3:45:00' },
];

export default function Goal() {
  const router = useRouter();
  const { race, profile, setRace, setProfile, setHasRace } = useAppStore();
  const days = profile.runDaysPerWeek;

  return (
    <Screen
      ambient="onboarding"
      bottomPad={130}
      footer={
        <Button
          variant="cta"
          label="Build my plan"
          onPress={() => {
            setHasRace(true);
            router.push('/(onboarding)/plan-preview');
          }}
        />
      }
    >
      <StepIndicator step={3} />
      <View style={{ gap: 4, marginBottom: 6 }}>
        <Txt v="eyebrow">Step 3 of 4</Txt>
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
              onPress={() => setRace({ distance: d.key, miles: d.miles, goalTime: d.goal })}
              style={[styles.tile, on && { boxShadow: `0 0 0 2px ${hues.accent.fill}, 0 10px 30px rgba(27, 26, 25, 0.05)` }]}
            >
              <Txt v="h3" color={on ? hues.accent.text : colors.ink}>{d.key}</Txt>
              <Txt v="small" style={{ color: colors.caption }}>{d.miles} mi</Txt>
            </Pressable>
          );
        })}
      </View>

      <Card gap={0} style={{ paddingTop: 6, paddingBottom: 6 }}>
        <View style={styles.row}>
          <Txt style={styles.label}>Race date</Txt>
          <TextInput value={race.date} onChangeText={(date) => setRace({ date })} accessibilityLabel="Race date" style={styles.input} placeholder="YYYY-MM-DD" />
        </View>
        <View style={styles.row}>
          <Txt style={styles.label}>Goal time</Txt>
          <TextInput value={race.goalTime} onChangeText={(goalTime) => setRace({ goalTime })} accessibilityLabel="Goal time" style={styles.input} />
        </View>
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

      <View style={styles.note}>
        <Flag size={16} color={hues.accent.text} strokeWidth={2.2} />
        <Txt style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: '#1B338F' }}>
          {weeksUntil(race.date)} weeks out at {days} runs a week. Your goal pace works out to {paceFor(race.goalTime, race.miles)} /mi.
        </Txt>
      </View>

      <Button
        variant="ghost"
        label="I'm not training for a race right now"
        onPress={() => {
          setHasRace(false);
          router.push('/(onboarding)/plan-preview');
        }}
        style={{ alignSelf: 'center' }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, padding: 18, borderRadius: 20, backgroundColor: colors.white, gap: 4, boxShadow: shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink2 },
  input: { minWidth: 150, textAlign: 'right', fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink, padding: 0 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.field, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(42, 82, 240, 0.10)' },
});
