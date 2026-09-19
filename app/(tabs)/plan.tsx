import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, Check, ChevronRight, Flag, Moon, Sparkles, TrendingUp, Zap } from 'lucide-react-native';
import { BlockChart, Button, Card, CardHeader, Chip, Header, HistoryBars, IconCircle, Screen, Stat, Txt } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { targetsFor } from '@/lib/fuel';
import { n, shortDate } from '@/lib/format';
import { sampleBlockMiles, sampleBlockPhases } from '@/data/sample';
import { colors, fonts, hues, workoutHue } from '@/theme/tokens';
import type { WorkoutType } from '@/types';

const ICON: Record<WorkoutType, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  rest: Moon,
  intervals: Zap,
  tempo: Zap,
  easy: Activity,
  recovery: Activity,
  long: Activity,
};

/** Plan tab: this week (tap a day), the adaptive suggestion, the whole block. */
export default function Plan() {
  const router = useRouter();
  const { week, todayIndex, profile, race, suggestion, setSuggestion, history } = useAppStore();
  const [open, setOpen] = useState<number>(todayIndex);

  const totalMiles = week.reduce((a, d) => a + d.miles, 0);
  const avgKcal = Math.round(week.reduce((a, d) => a + targetsFor(d, profile).kcal, 0) / week.length / 10) * 10;
  // The saved block for cloud accounts; the canvas sample in local mode.
  const blockMiles = race.block?.miles ?? sampleBlockMiles;
  const blockPhases = race.block?.phases ?? sampleBlockPhases;
  const peakWeek = blockMiles.indexOf(Math.max(...blockMiles)) + 1;
  const taperFrom = blockPhases.indexOf('taper') + 1;
  const last3 = history ? Math.round(history.weeklyMiles.slice(-3).reduce((a, b) => a + b, 0) / 3) : 0;

  return (
    <Screen ambient="plan">
      <Header
        eyebrow={`Week ${race.currentWeek} of ${race.totalWeeks} · ${race.phase}`}
        title="Plan"
        right={
          <Pressable onPress={() => setOpen(todayIndex)} style={styles.pillBtn} accessibilityRole="button">
            <Txt style={{ fontFamily: fonts.bold, fontSize: 13 }}>Today</Txt>
          </Pressable>
        }
      />

      <Card gap={0} style={{ paddingTop: 6, paddingBottom: 6, paddingHorizontal: 12 }}>
        {week.map((d, i) => {
          const hue = workoutHue[d.type];
          const Icon = ICON[d.type];
          const t = targetsFor(d, profile);
          const isOpen = open === i;
          return (
            <View key={d.dow} style={i > 0 && styles.rowBorder}>
              <Pressable onPress={() => setOpen(isOpen ? -1 : i)} style={styles.dayRow} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
                <Txt style={{ width: 34, fontFamily: fonts.bold, fontSize: 13, color: i === todayIndex ? hues.accent.text : colors.caption }}>{d.dow}</Txt>
                <IconCircle icon={Icon} hue={hue} />
                <Txt style={{ flex: 1, fontFamily: d.type === 'long' ? fonts.extrabold : fonts.bold, fontSize: 15, color: colors.ink }}>
                  {d.title}
                  {d.miles ? ` · ${d.miles} mi` : ''}
                </Txt>
                <Txt style={{ fontFamily: fonts.extrabold, fontSize: 15, color: hues.accent.text }}>{n(t.kcal)}</Txt>
              </Pressable>
              {isOpen ? (
                <View style={styles.detail}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Stat label="Carbs" value={`${t.carbs} g`} color={hues.amber.text} />
                    <Stat label="Protein" value={`${t.protein} g`} color={hues.teal.text} />
                    <Stat label="Effort" value={d.effort ?? '—'} />
                  </View>
                  <Txt v="small" style={{ fontFamily: fonts.medium }}>{d.note}</Txt>
                  {d.done ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <IconCircle icon={Check} hue={hue} size={24} iconSize={13} strokeWidth={2.8} />
                      <Txt v="small">
                        <Txt style={{ fontFamily: fonts.bold, color: colors.ink }}>Completed · </Txt>
                        {d.done}
                      </Txt>
                    </View>
                  ) : i === todayIndex ? (
                    <Pressable onPress={() => router.push('/(tabs)/today')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' }}>
                      <Txt style={{ fontFamily: fonts.bold, fontSize: 13, color: hues.violet.text }}>Open today</Txt>
                      <ChevronRight size={14} color={hues.violet.text} strokeWidth={2.4} />
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>

      {suggestion !== 'dismissed' ? (
        <Card outline="rgba(34, 179, 166, 0.35)" gap={12}>
          <CardHeader icon={Sparkles} title="Plan suggestion" hue={hues.teal} right={<Chip label="Next week" hue={hues.teal} />} />
          {suggestion === 'open' ? (
            <>
              <Txt v="body">Recovery dipped to 61 after Tuesday's tempo. Swap next Tuesday's intervals with Wednesday's easy run so the workout lands on fresher legs.</Txt>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button label="Apply" grow onPress={() => setSuggestion('applied')} style={{ height: 44 }} />
                <Button variant="secondary" label="Keep plan" onPress={() => setSuggestion('dismissed')} style={{ height: 44 }} />
              </View>
            </>
          ) : (
            <View style={styles.between}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <IconCircle icon={Check} hue={hues.teal} size={28} iconSize={15} strokeWidth={2.8} />
                <Txt v="small" style={{ flex: 1 }}>
                  <Txt style={{ fontFamily: fonts.bold, color: colors.ink }}>Applied · </Txt>
                  Tue is now Easy 6 mi, Wed is Intervals 7 mi
                </Txt>
              </View>
              <Pressable onPress={() => setSuggestion('open')} hitSlop={8}>
                <Txt style={{ fontFamily: fonts.bold, fontSize: 14, color: hues.teal.text }}>Undo</Txt>
              </Pressable>
            </View>
          )}
        </Card>
      ) : null}

      <Card gap={12}>
        <CardHeader icon={Flag} title="Training block" hue={hues.accent} meta={`${race.totalWeeks} weeks · ${race.name.split(' ')[0]}`} />
        <BlockChart miles={blockMiles} phases={blockPhases} currentWeek={race.currentWeek} />
        <View style={styles.phaseLabels}>
          {['Base', 'Build', 'Peak', 'Taper', 'Race'].map((p) => (
            <Txt key={p} v="micro">{p}</Txt>
          ))}
        </View>
        <Txt v="bodyMuted" style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.hairline }}>
          Peak of {Math.max(...blockMiles)} mi in week {peakWeek}{taperFrom > 0 ? ` · taper from week ${taperFrom}` : ''} · race day {shortDate(race.date)}
        </Txt>
      </Card>

      {history && history.runs > 0 ? (
        <Card gap={12}>
          <CardHeader icon={TrendingUp} title="Last 12 weeks" hue={hues.teal} meta={`${history.runs} runs synced`} />
          <HistoryBars weeklyMiles={history.weeklyMiles} height={110} right={`Last 3 weeks · ${last3} mi avg`} />
        </Card>
      ) : null}

      <Card style={{ paddingTop: 18 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Stat label="Distance" value={totalMiles} unit="mi" color={hues.sky.text} size="md" />
          <Stat label="Avg fuel" value={n(avgKcal)} unit="kcal" color={hues.accent.text} size="md" />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pillBtn: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(27, 26, 25, 0.08)' },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.hairline },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 6 },
  detail: { marginLeft: 52, marginRight: 6, marginBottom: 12, padding: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.tint, gap: 10 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  phaseLabels: { flexDirection: 'row', justifyContent: 'space-between' },
});
