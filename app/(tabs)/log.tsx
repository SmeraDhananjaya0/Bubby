import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Camera, Check, ChevronRight, Droplets, Flame, Plus, Search, Utensils, X, Zap } from 'lucide-react-native';
import { Bar, Button, Card, CardHeader, Chip, Header, IconCircle, Screen, Sheet, Txt } from '@/components';
import { selectToday, useAppStore } from '@/store/useAppStore';
import { sum, targetsFor } from '@/lib/fuel';
import { n } from '@/lib/format';
import { dinnerOptions, quickFoods, runFuels, supplements } from '@/data/sample';
import { colors, fonts, hues, macroHue, radii } from '@/theme/tokens';
import type { FoodOption } from '@/types';

/** Log tab: search/snap, what's left, run fuel + supplements, meals, hydration. */
export default function Log() {
  const router = useRouter();
  const { add } = useLocalSearchParams<{ add?: string }>();
  const { meals, runFuel, supplements: taken, water, profile, addMeal, removeMeal, addRunFuel, toggleSupplement, addWater } = useAppStore();
  const today = useAppStore(selectToday);
  const [sheet, setSheet] = useState<null | 'dinner' | 'quick'>(null);

  useEffect(() => {
    if (add === '1') setSheet('quick');
  }, [add]);

  const targets = targetsFor(today, profile);
  const fuelRows = runFuels
    .filter((f) => runFuel[f.label])
    .map((f) => ({ id: `fuel-${f.label}`, name: 'Run fuel', desc: `${f.label}${runFuel[f.label] > 1 ? ` × ${runFuel[f.label]}` : ''}`, kcal: f.kcal * runFuel[f.label], carbs: f.carbs * runFuel[f.label], protein: 0, fat: 0 }));
  const eaten = sum([...meals, ...fuelRows]);
  const remaining = Math.max(0, targets.kcal - eaten.kcal);
  const dinner = meals.find((m) => m.name === 'Dinner');
  const glasses = Math.round(water / 0.25);

  const logFood = (slot: string, f: FoodOption) => {
    addMeal({ name: slot, desc: f.name, kcal: f.kcal, carbs: f.carbs, protein: f.protein, fat: f.fat });
    setSheet(null);
  };

  return (
    <Screen ambient="log">
      <Header
        eyebrow={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        title="Log"
        right={
          <Pressable onPress={() => router.push('/nutrients')} style={styles.pillBtn} accessibilityRole="button">
            <Txt style={{ fontFamily: fonts.bold, fontSize: 13 }}>Nutrients</Txt>
            <ChevronRight size={13} color={colors.ink} strokeWidth={2.6} />
          </Pressable>
        }
      />

      <View style={styles.search}>
        <Search size={18} color={colors.caption} strokeWidth={2.4} />
        <TextInput placeholder="Search or snap a meal" placeholderTextColor={colors.caption} style={styles.searchInput} accessibilityLabel="Search foods" onFocus={() => setSheet('quick')} />
        <Pressable accessibilityRole="button" accessibilityLabel="Snap a meal with the camera" style={styles.camera}>
          <Camera size={18} color={hues.accent.text} strokeWidth={2.2} />
        </Pressable>
      </View>

      <Card>
        <CardHeader icon={Flame} title="Remaining" hue={hues.accent} meta={`${n(eaten.kcal)} of ${n(targets.kcal)} eaten`} />
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Txt v="hero" color={hues.accent.text}>{n(remaining)}</Txt>
          <Txt v="captionBold" style={{ fontSize: 16 }}>kcal</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {(
            [
              ['Carbs', eaten.carbs, targets.carbs, macroHue.carbs],
              ['Protein', eaten.protein, targets.protein, macroHue.protein],
              ['Fat', eaten.fat, targets.fat, macroHue.fat],
            ] as const
          ).map(([label, v, g, hue]) => (
            <View key={label} style={{ flex: 1, gap: 6 }}>
              <View style={styles.between}>
                <Txt style={{ fontFamily: fonts.bold, fontSize: 13 }}>{label}</Txt>
                <Txt style={{ fontFamily: fonts.bold, fontSize: 12, color: hue.text }}>{Math.max(0, g - v)} g</Txt>
              </View>
              <Bar value={v} goal={g} hue={hue} height={7} tintedTrack />
            </View>
          ))}
        </View>
        <Txt v="caption" style={{ fontFamily: fonts.semibold }}>
          Left to hit today's targets · {today.type === 'long' ? 'long-run day' : `${today.type} day`}
        </Txt>
      </Card>

      <Card gap={12}>
        <CardHeader icon={Zap} title="Run fuel & supplements" hue={hues.amber} meta="Tap to log" />
        <Txt v="micro">During the run</Txt>
        <View style={styles.chips}>
          {runFuels.map((f) => (
            <Chip
              key={f.label}
              size="md"
              hue={hues.amber}
              onPress={() => addRunFuel(f.label)}
              icon={<Plus size={12} color={hues.amber.text} strokeWidth={2.8} />}
              label={`${f.label}  ${f.sub}`}
              accessibilityLabel={`Log ${f.label}`}
            />
          ))}
        </View>
        <Txt v="micro" style={{ marginTop: 2 }}>Supplements</Txt>
        <View style={styles.chips}>
          {supplements.slice(0, 4).map((s) => {
            const on = !!taken[s.name];
            return (
              <Chip
                key={s.name}
                size="md"
                hue={on ? hues.violet : undefined}
                onPress={() => toggleSupplement(s.name)}
                icon={on ? <Check size={12} color={hues.violet.text} strokeWidth={2.8} /> : <Plus size={12} color={colors.ink2} strokeWidth={2.8} />}
                label={s.name === 'Creatine' ? 'Creatine 5 g' : s.name}
                accessibilityLabel={`${on ? 'Unlog' : 'Log'} ${s.name}`}
              />
            );
          })}
        </View>
      </Card>

      <Card gap={4} flushBottom>
        <CardHeader icon={Utensils} title="Meals" hue={hues.green} meta={`${meals.length + fuelRows.length} logged`} />
        <View style={{ marginTop: 6 }}>
          {[...meals.filter((m) => m.name !== 'Dinner'), ...fuelRows].map((m) => (
            <View key={m.id} style={styles.mealRow}>
              <View style={{ gap: 3, flex: 1 }}>
                <Txt v="label">{m.name}</Txt>
                <Txt v="caption" style={{ fontFamily: fonts.medium }}>
                  {m.desc}
                </Txt>
              </View>
              <Txt style={{ fontFamily: fonts.extrabold, fontSize: 16, color: hues.accent.text }}>{n(m.kcal)}</Txt>
            </View>
          ))}
          <View style={styles.mealRow}>
            <View style={{ gap: 3, flex: 1 }}>
              <Txt v="label">Dinner</Txt>
              <Txt v="caption" style={{ fontFamily: fonts.medium }}>{dinner ? dinner.desc : 'Not logged yet'}</Txt>
            </View>
            {dinner ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Txt style={{ fontFamily: fonts.extrabold, fontSize: 16, color: hues.accent.text }}>{n(dinner.kcal)}</Txt>
                <Pressable onPress={() => removeMeal(dinner.id)} accessibilityRole="button" accessibilityLabel="Remove dinner" style={styles.removeBtn}>
                  <X size={13} color={colors.ink2} strokeWidth={2.6} />
                </Pressable>
              </View>
            ) : (
              <Button label="Log" onPress={() => setSheet('dinner')} icon={<Plus size={12} color={colors.white} strokeWidth={2.8} />} style={{ height: 34, paddingHorizontal: 12, borderRadius: 17 }} />
            )}
          </View>
        </View>
      </Card>

      <Card>
        <CardHeader icon={Droplets} title="Hydration" hue={hues.sky} right={<Txt v="cardMeta"><Txt style={{ fontFamily: fonts.extrabold, color: colors.ink }}>{water.toFixed(2).replace(/0$/, '')}</Txt> of 3.0 L</Txt>} />
        <View style={{ flexDirection: 'row', gap: 4, height: 16 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <View key={i} style={{ flex: 1, borderRadius: 5, backgroundColor: i < glasses ? hues.sky.fill : colors.track }} />
          ))}
        </View>
        <View style={styles.between}>
          <Chip size="md" hue={hues.sky} label="250 ml" icon={<Plus size={14} color={hues.sky.text} strokeWidth={2.6} />} onPress={() => addWater(0.25)} style={{ height: 40, paddingHorizontal: 16, borderRadius: 13 }} accessibilityLabel="Add 250 millilitres" />
          <Pressable onPress={() => addWater(-0.25)} hitSlop={8} accessibilityRole="button">
            <Txt style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.caption }}>Undo</Txt>
          </Pressable>
        </View>
      </Card>

      <Card onPress={() => router.push('/nutrients')} style={{ paddingTop: 14, paddingBottom: 14 }}>
        <View style={[styles.between, { gap: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <IconCircle icon={Droplets} hue={hues.sky} />
            <View style={{ gap: 2 }}>
              <Txt v="label">Micros & supplements</Txt>
              <Txt v="caption" style={{ fontFamily: fonts.medium }}>Iron and sodium are running low today</Txt>
            </View>
          </View>
          <ChevronRight size={16} color={colors.caption} strokeWidth={2.4} />
        </View>
      </Card>

      <Sheet visible={sheet === 'dinner'} onClose={() => setSheet(null)} title="Log dinner" subtitle={`${n(remaining)} kcal and ${Math.max(0, targets.carbs - eaten.carbs)} g carbs left today`}>
        <Txt v="micro">Suggested for tonight</Txt>
        <View style={{ gap: 8 }}>
          {dinnerOptions.map((o) => (
            <Pressable key={o.name} onPress={() => logFood('Dinner', o)} style={styles.option} accessibilityRole="button">
              <View style={{ gap: 2, flex: 1 }}>
                <Txt v="label">{o.name}</Txt>
                <Txt v="caption" style={{ fontFamily: fonts.semibold }}>C {o.carbs} · P {o.protein} · F {o.fat}</Txt>
              </View>
              <Txt style={{ fontFamily: fonts.extrabold, fontSize: 15, color: hues.accent.text }}>{o.kcal}</Txt>
              <IconCircle icon={Plus} hue={hues.green} size={28} iconSize={14} strokeWidth={2.8} />
            </Pressable>
          ))}
        </View>
        <Txt v="caption">Picked to close most of tonight's carb gap without overshooting calories.</Txt>
      </Sheet>

      <Sheet visible={sheet === 'quick'} onClose={() => setSheet(null)} title="Add food" subtitle={`Logged at the current time · ${n(remaining)} kcal left today`}>
        <Txt v="micro">Quick add</Txt>
        <View style={styles.grid}>
          {quickFoods.map((f) => (
            <Pressable key={f.name} onPress={() => logFood('Snack', f)} style={[styles.option, { width: '48%', flexGrow: 1 }]} accessibilityRole="button">
              <View style={{ gap: 2, flex: 1 }}>
                <Txt style={{ fontFamily: fonts.bold, fontSize: 14 }}>{f.name}</Txt>
                <Txt v="caption" style={{ fontSize: 11, fontFamily: fonts.semibold }}>{f.kcal} kcal · C {f.carbs}</Txt>
              </View>
              <IconCircle icon={Plus} hue={hues.green} size={28} iconSize={14} strokeWidth={2.8} />
            </Pressable>
          ))}
        </View>
        <Button variant="cta" label="Done" onPress={() => setSheet(null)} style={{ height: 48 }} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pillBtn: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.85)', flexDirection: 'row', alignItems: 'center', gap: 4, boxShadow: '0 1px 2px rgba(27, 26, 25, 0.08)' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingLeft: 16, paddingRight: 6, borderRadius: 18, backgroundColor: colors.white, boxShadow: '0 1px 2px rgba(27, 26, 25, 0.04), 0 10px 30px rgba(27, 26, 25, 0.05)' },
  searchInput: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, padding: 0 },
  camera: { width: 40, height: 40, borderRadius: 14, backgroundColor: hues.accent.tint, alignItems: 'center', justifyContent: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.hairline },
  removeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.field, alignItems: 'center', justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingLeft: 14, borderRadius: radii.cardInner, backgroundColor: colors.tint },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
