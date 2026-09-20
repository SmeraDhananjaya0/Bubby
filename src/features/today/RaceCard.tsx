import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Flag } from 'lucide-react-native';
import { Button, Card, CardHeader, Chip, Txt } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { daysUntil, paceFor, shortDate } from '@/lib/format';
import { colors, fonts, hues, type } from '@/theme/tokens';

/** Goal race hero: name in the serif, live countdown, goal chips, block progress. */
export function RaceCard() {
  const router = useRouter();
  const race = useAppStore((s) => s.race);
  const days = daysUntil(race.date);
  const weeks = Array.from({ length: race.totalWeeks }, (_, i) => i + 1);
  const phases = race.block?.phases ?? [];
  const peakStart = phases.indexOf('peak') + 1;
  const phaseNow = phases[race.currentWeek - 1];
  const peakLabel =
    race.currentWeek === race.totalWeeks ? 'Race week'
    : phaseNow === 'taper' ? 'Tapering'
    : phaseNow === 'peak' ? 'Peak weeks'
    : peakStart > race.currentWeek ? `Peak in ${peakStart - race.currentWeek} wks`
    : `${race.totalWeeks - race.currentWeek} wks to go`;

  return (
    <Card gap={16}>
      <CardHeader icon={Flag} title="Goal race" hue={hues.accent} link={{ label: 'Plan', onPress: () => router.push('/(tabs)/plan') }} />
      <View style={styles.heroRow}>
        <View style={{ gap: 6, flex: 1 }}>
          <Txt v="serif">{race.name}</Txt>
          <Txt v="bodyMuted">
            {shortDate(race.date)} · {race.miles} mi
          </Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt style={styles.countdown}>{days ?? '—'}</Txt>
          <Txt v="eyebrow">{days === 1 ? 'day' : 'days'}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Chip label={`Goal ${race.goalTime}`} hue={hues.accent} size="md" style={{ height: 30 }} />
        <Chip label={`${paceFor(race.goalTime, race.miles)} /mi`} size="md" style={{ height: 30 }} />
        <Pressable onPress={() => router.push('/(onboarding)/goal')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Edit race" style={{ marginLeft: 'auto', minHeight: 30, justifyContent: 'center' }}>
          <Txt style={{ fontFamily: fonts.bold, fontSize: 13, color: hues.accent.text }}>Edit</Txt>
        </Pressable>
      </View>
      <View style={{ gap: 8 }}>
        <View style={styles.between}>
          <Txt v="small">
            Week {race.currentWeek} of {race.totalWeeks} · {race.phase}
          </Txt>
          <Txt v="small">{peakLabel}</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 3, height: 8 }}>
          {weeks.map((w) => (
            <View
              key={w}
              style={{
                flex: 1,
                borderRadius: 4,
                backgroundColor: w < race.currentWeek ? hues.accent.fill : w === race.currentWeek ? 'rgba(42, 82, 240, 0.45)' : colors.trackDark,
              }}
            />
          ))}
        </View>
      </View>
    </Card>
  );
}

/** Shown instead of the race card when no race is set. */
export function NoRaceNudge() {
  const router = useRouter();
  return (
    <Card tint="#E6ECFF" gap={12} style={{ paddingTop: 18 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt style={{ ...type.serif, fontSize: 28, lineHeight: 30 }}>Training for something?</Txt>
          <Txt v="bodyMuted">Add a race and the next 12–18 weeks get shaped around it — long runs, workouts and fueling included.</Txt>
        </View>
        <View style={styles.flagBubble}>
          <Flag size={18} color={hues.accent.text} strokeWidth={2.2} />
        </View>
      </View>
      <Button label="Add a race" onPress={() => router.push('/(onboarding)/goal')} style={{ alignSelf: 'flex-start', height: 44 }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  countdown: { fontFamily: fonts.extrabold, fontSize: 60, lineHeight: 56, letterSpacing: -3, color: hues.accent.fill },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  flagBubble: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
