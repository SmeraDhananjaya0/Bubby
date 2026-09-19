import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, Check, ChevronLeft, Droplets, Info, Pill } from 'lucide-react-native';
import { BarRow, Card, CardHeader, Screen, Txt } from '@/components';
import { selectToday, useAppStore } from '@/store/useAppStore';
import { sum, targetsFor } from '@/lib/fuel';
import { n } from '@/lib/format';
import { sampleMicros, supplements } from '@/data/sample';
import { colors, fonts, hues, macroHue } from '@/theme/tokens';

/** Nutrients: macros vs targets, the five runner micros, and the supplement checklist. */
export default function Nutrients() {
  const router = useRouter();
  const { meals, profile, supplements: taken, toggleSupplement } = useAppStore();
  const today = useAppStore(selectToday);
  const t = targetsFor(today, profile);
  const e = sum(meals);
  const takenCount = supplements.filter((s) => taken[s.name]).length;

  return (
    <Screen ambient="log">
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back to Log">
        <ChevronLeft size={16} color={hues.green.text} strokeWidth={2.6} />
        <Txt style={{ fontFamily: fonts.bold, fontSize: 15, color: hues.green.text }}>Log</Txt>
      </Pressable>
      <View style={{ gap: 4, marginBottom: 6 }}>
        <Txt v="eyebrow">Today</Txt>
        <Txt v="title">Nutrients</Txt>
      </View>

      <Card>
        <CardHeader icon={Activity} title="Macros" hue={hues.amber} meta={today.type === 'long' ? 'Long-run targets' : 'Today’s targets'} />
        <View style={{ gap: 14 }}>
          <BarRow name="Carbs" value={e.carbs} goal={t.carbs} unit="g" hue={macroHue.carbs} />
          <BarRow name="Protein" value={e.protein} goal={t.protein} unit="g" hue={macroHue.protein} />
          <BarRow name="Fat" value={e.fat} goal={t.fat} unit="g" hue={macroHue.fat} />
        </View>
      </Card>

      <Card>
        <CardHeader icon={Droplets} title="Micros for runners" hue={hues.sky} meta="Daily" />
        <View style={{ gap: 14 }}>
          {sampleMicros.map((m) => (
            <BarRow key={m.name} name={m.name} value={m.val} goal={m.goal >= 1000 ? n(m.goal) : m.goal} numericGoal={m.goal} unit={m.unit} hue={hues[m.hue]} />
          ))}
        </View>
      </Card>

      <View style={styles.note}>
        <Info size={16} color={hues.sky.text} strokeWidth={2.2} style={{ marginTop: 1 }} />
        <Txt style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18, color: '#143F66' }}>
          Sodium and potassium go out in sweat on long runs. Iron and vitamin D carry oxygen and protect bone — both run low in high-mileage weeks.
        </Txt>
      </View>

      <Card gap={4} style={{ paddingBottom: 8 }}>
        <CardHeader icon={Pill} title="Supplements" hue={hues.violet} meta={`${takenCount} of ${supplements.length} today`} />
        <View style={{ marginTop: 4 }}>
          {supplements.map((s) => {
            const on = !!taken[s.name];
            return (
              <Pressable key={s.name} onPress={() => toggleSupplement(s.name)} style={styles.suppRow} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt v="label">{s.name}</Txt>
                  <Txt v="caption" style={{ fontFamily: fonts.medium }}>{s.why}</Txt>
                </View>
                <Txt style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.ink2 }}>{s.dose}</Txt>
                <View style={[styles.check, { backgroundColor: on ? hues.violet.tint : colors.field }]}>
                  <Check size={14} color={on ? hues.violet.text : colors.disabled} strokeWidth={2.8} />
                </View>
              </Pressable>
            );
          })}
        </View>
        <Txt v="caption" style={{ paddingTop: 10, paddingBottom: 6, borderTopWidth: 1, borderTopColor: colors.hairline }}>
          Creatine at 3–5 g a day is the best-supported one for runners doing hard sessions. Iron only if bloodwork says so.
        </Txt>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, height: 32, alignSelf: 'flex-start' },
  note: { flexDirection: 'row', gap: 10, padding: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: hues.sky.tint },
  suppRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.hairline },
  check: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
