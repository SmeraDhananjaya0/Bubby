import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Flame } from 'lucide-react-native';
import { Card, CardFooter, CardHeader, Chip, Rings, Txt } from '@/components';
import { selectToday, useAppStore } from '@/store/useAppStore';
import { fuelBreakdown, sum, targetsFor } from '@/lib/fuel';
import { n } from '@/lib/format';
import { fonts, hues, macroHue } from '@/theme/tokens';
import { runFuels } from '@/data/sample';

function Line({ label, value, goal, unit, color }: { label: string; value: number; goal: number; unit: string; color: string }) {
  return (
    <View style={{ gap: 1 }}>
      <Txt v="captionBold">{label}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Txt style={{ fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 28, letterSpacing: -0.78, color }}>{n(value)}</Txt>
        <Txt v="captionBold" style={{ fontSize: 13 }}>
          / {n(goal)} {unit}
        </Txt>
      </View>
    </View>
  );
}

/** Calories / carbs / protein against today's targets, with the three rings. */
export function FuelTodayCard() {
  const router = useRouter();
  const today = useAppStore(selectToday);
  const profile = useAppStore((s) => s.profile);
  const meals = useAppStore((s) => s.meals);
  const runFuel = useAppStore((s) => s.runFuel);

  const targets = targetsFor(today, profile);
  const split = fuelBreakdown(today, profile);
  const fuelMacros = runFuels
    .filter((f) => runFuel[f.label])
    .map((f) => ({ kcal: f.kcal * runFuel[f.label], carbs: f.carbs * runFuel[f.label], protein: 0, fat: 0 }));
  const eaten = sum([...meals, ...fuelMacros]);
  const dayLabel = today.type === 'long' ? 'Long-run day' : today.type === 'rest' ? 'Rest day' : today.type === 'tempo' || today.type === 'intervals' ? 'Workout day' : 'Easy day';

  return (
    <Card>
      <CardHeader icon={Flame} title="Fuel today" hue={hues.accent} right={<Chip label={dayLabel} hue={hues.amber} />} />
      <View style={styles.row}>
        <View style={{ gap: 12, flex: 1 }}>
          <Line label="Calories" value={eaten.kcal} goal={targets.kcal} unit="kcal" color={macroHue.calories.text} />
          <Line label="Carbs" value={eaten.carbs} goal={targets.carbs} unit="g" color={macroHue.carbs.text} />
          <Line label="Protein" value={eaten.protein} goal={targets.protein} unit="g" color={macroHue.protein.text} />
        </View>
        <Rings
          size={140}
          stroke={11}
          rings={[
            { pct: eaten.kcal / targets.kcal, color: macroHue.calories.fill, track: macroHue.calories.tint },
            { pct: eaten.carbs / targets.carbs, color: macroHue.carbs.fill, track: macroHue.carbs.tint },
            { pct: eaten.protein / targets.protein, color: macroHue.protein.fill, track: macroHue.protein.tint },
          ]}
        />
      </View>
      <Txt v="caption" style={{ fontFamily: fonts.semibold }}>
        {split.run > 0 ? `${n(split.base)} kcal baseline + ${n(split.run)} for ${today.miles} mi` : `${n(split.base)} kcal baseline · no run today`}
      </Txt>
      <CardFooter style={styles.footer}>
        <Txt v="small">
          {n(Math.max(0, targets.kcal - eaten.kcal))} kcal left · {Math.max(0, targets.carbs - eaten.carbs)} g carbs to go
        </Txt>
        <Pressable onPress={() => router.push('/(tabs)/log')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Txt style={{ fontFamily: fonts.bold, fontSize: 13, color: hues.accent.text }}>Log a meal</Txt>
          <ChevronRight size={14} color={hues.accent.text} strokeWidth={2.4} />
        </Pressable>
      </CardFooter>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
