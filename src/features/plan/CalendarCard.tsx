import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Calendar, Check, ChevronLeft, ChevronRight, Flag } from 'lucide-react-native';
import { Card, CardHeader, Chip, IconCircle, Stat, Txt } from '@/components';
import { fuelBreakdown, targetsFor } from '@/lib/fuel';
import { isoAdd, localISO, monthLabel, n, shortDate } from '@/lib/format';
import { colors, fonts, hues, workoutHue } from '@/theme/tokens';
import type { DayPlan, Profile } from '@/types';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TYPE_LABEL: Record<DayPlan['type'], string> = { easy: 'Easy', recovery: 'Recovery', intervals: 'Intervals', tempo: 'Tempo', long: 'Long run', rest: 'Rest' };

const firstOfMonth = (iso: string) => iso.slice(0, 7) + '-01';
const addMonths = (iso: string, k: number) => {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + k, 1);
  return localISO(d);
};

/**
 * Every day to race day on a Monday-first month grid. Each cell shows the day's miles in the
 * workout's hue; tap a day for the session, its paces and its fuel target. Past days are dimmed,
 * today is ringed, race day carries a flag.
 */
export function CalendarCard({ plan, profile, raceDate, raceName }: { plan: DayPlan[]; profile: Profile; raceDate: string; raceName: string }) {
  const today = localISO();
  const byIso = useMemo(() => new Map(plan.filter((d) => d.iso).map((d) => [d.iso!, d])), [plan]);
  const firstIso = plan[0]?.iso ?? today;
  const lastIso = plan[plan.length - 1]?.iso ?? raceDate;
  const [month, setMonth] = useState(firstOfMonth(today >= firstIso ? today : firstIso));
  const [selected, setSelected] = useState<string>(today);

  const canPrev = month > firstOfMonth(firstIso);
  const canNext = month < firstOfMonth(lastIso);

  // Grid: leading blanks so the 1st lands on its weekday (Mon = 0).
  const cells = useMemo(() => {
    const first = new Date(month + 'T00:00:00');
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array(lead).fill(null);
    for (let i = 0; i < days; i++) out.push(isoAdd(month, i));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const day = byIso.get(selected);
  const t = day ? targetsFor(day, profile) : null;
  const split = day ? fuelBreakdown(day, profile) : null;
  const hue = day ? workoutHue[day.type] : workoutHue.rest;

  return (
    <Card gap={12}>
      <CardHeader
        icon={Calendar}
        title="Calendar"
        hue={hues.violet}
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Pressable onPress={() => canPrev && setMonth(addMonths(month, -1))} disabled={!canPrev} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8} style={styles.nav}>
              <ChevronLeft size={16} color={canPrev ? colors.ink : colors.disabled} strokeWidth={2.4} />
            </Pressable>
            <Txt v="cardMeta" style={{ minWidth: 112, textAlign: 'center' }} numberOfLines={1}>{monthLabel(month)}</Txt>
            <Pressable onPress={() => canNext && setMonth(addMonths(month, 1))} disabled={!canNext} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8} style={styles.nav}>
              <ChevronRight size={16} color={canNext ? colors.ink : colors.disabled} strokeWidth={2.4} />
            </Pressable>
          </View>
        }
      />

      <View style={styles.grid}>
        {DOW.map((d, i) => (
          <Txt key={i} v="micro" style={[styles.cell, { textAlign: 'center', height: 16 }]}>{d}</Txt>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <View key={`b${i}`} style={styles.cell} />;
          const d = byIso.get(iso);
          const past = iso < today;
          const isToday = iso === today;
          const isSel = iso === selected;
          const isRace = iso === raceDate;
          const h = d ? workoutHue[d.type] : workoutHue.rest;
          const label = `${shortDate(iso)}, ${d ? `${TYPE_LABEL[d.type]}${d.miles ? ` ${d.miles} miles` : ''}` : 'nothing planned'}`;
          return (
            <Pressable key={iso} onPress={() => setSelected(iso)} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: isSel }} style={[styles.cell, styles.day, isSel && styles.selected, past && !isSel && { opacity: 0.45 }]}>
              <Txt style={{ fontFamily: isToday ? fonts.extrabold : fonts.bold, fontSize: 12, lineHeight: 14, color: isToday ? hues.accent.text : colors.ink2 }}>{Number(iso.slice(8, 10))}</Txt>
              {isRace ? (
                <View style={[styles.pill, { backgroundColor: hues.accent.fill }]}>
                  <Flag size={10} color={colors.white} strokeWidth={2.8} />
                </View>
              ) : d && d.miles > 0 ? (
                <View style={[styles.pill, { backgroundColor: d.done ? h.fill : h.tint }]}>
                  <Txt style={{ fontFamily: fonts.extrabold, fontSize: 11, lineHeight: 13, color: d.done ? colors.white : h.text }}>{d.miles}</Txt>
                </View>
              ) : (
                <View style={[styles.pill, { backgroundColor: 'transparent' }]}>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: d ? colors.trackDark : 'transparent' }} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        {(['easy', 'tempo', 'intervals', 'long', 'recovery'] as const).map((k) => (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: workoutHue[k].fill }} />
            <Txt v="caption" style={{ fontSize: 11 }}>{TYPE_LABEL[k]}</Txt>
          </View>
        ))}
      </View>

      <View style={styles.detail}>
        {day ? (
          <>
            <View style={styles.between}>
              <View style={{ gap: 2, flex: 1 }}>
                <Txt v="captionBold">{shortDate(selected)}{selected === today ? ' · Today' : ''}</Txt>
                <Txt v="h3" color={day.type === 'rest' ? colors.ink2 : hue.text}>{selected === raceDate ? raceName || day.title : day.title}</Txt>
              </View>
              {t ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Txt style={{ fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: -0.4, color: hues.accent.text }}>{n(t.kcal)}</Txt>
                  <Txt v="captionBold">kcal</Txt>
                </View>
              ) : null}
            </View>
            {day.pace || day.effort || day.time ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {day.pace ? <Chip label={`${day.pace} /mi`} hue={hue} onTint /> : null}
                {day.effort ? <Chip label={day.effort} onTint /> : null}
                {day.time ? <Chip label={day.time} onTint /> : null}
              </View>
            ) : null}
            <Txt v="small" style={{ fontFamily: fonts.medium }}>{day.note}</Txt>
            {t && split ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Stat label="Carbs" value={`${t.carbs} g`} color={hues.amber.text} />
                <Stat label="Protein" value={`${t.protein} g`} color={hues.teal.text} />
                <Stat label="Run cost" value={split.run ? `+${n(split.run)}` : '—'} color={hues.accent.text} />
              </View>
            ) : null}
            {day.done ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconCircle icon={Check} hue={hue} size={24} iconSize={13} strokeWidth={2.8} />
                <Txt v="small"><Txt style={{ fontFamily: fonts.bold, color: colors.ink }}>Completed · </Txt>{day.done}</Txt>
              </View>
            ) : null}
          </>
        ) : (
          <Txt v="small" style={{ fontFamily: fonts.medium }}>{selected < firstIso ? 'Before your plan started.' : selected > lastIso ? 'After race day. Recover, then pick the next one.' : 'Nothing planned.'}</Txt>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  nav: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 4 },
  cell: { width: `${100 / 7}%` },
  day: { alignItems: 'center', gap: 3, paddingVertical: 4, borderRadius: 12 },
  selected: { backgroundColor: colors.tint, boxShadow: `0 0 0 1.5px ${hues.violet.fill}` },
  pill: { minWidth: 26, height: 20, paddingHorizontal: 5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 2 },
  detail: { padding: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.tint, gap: 10 },
  between: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
});
