import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, X, Zap } from 'lucide-react-native';
import { Button, Card, CardHeader, Chip, Header, Rings, Screen, Stat, Txt } from '@/components';
import { sampleRecap } from '@/data/sample';
import { n } from '@/lib/format';
import { colors, fonts, hues, macroHue } from '@/theme/tokens';

/** Morning recap of yesterday's fueling and how today tops it up. */
export default function Recap() {
  const router = useRouter();
  const r = sampleRecap;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/today'));
  return (
    <Screen ambient="today" bottomPad={130} footer={<Button variant="cta" label="Got it" onPress={close} />}>
      <Header
        eyebrow="Recap"
        title="Yesterday"
        right={
          <Pressable onPress={close} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
            <X size={16} color={colors.ink} strokeWidth={2.4} />
          </Pressable>
        }
      />

      <Card gap={18} style={{ alignItems: 'center', paddingTop: 22 }}>
        <Rings
          size={168}
          stroke={14}
          gap={6}
          rings={[
            { pct: r.eaten / r.goal, color: macroHue.calories.fill, track: macroHue.calories.tint },
            { pct: r.carbs / r.carbsGoal, color: macroHue.carbs.fill, track: macroHue.carbs.tint },
          ]}
        >
          <Txt style={{ fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.78, color: hues.accent.text }}>{Math.round((r.eaten / r.goal) * 100)}%</Txt>
          <Txt v="micro">of target</Txt>
        </Rings>
        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
          <Stat boxed label="Eaten" value={n(r.eaten)} unit={`/ ${n(r.goal)} kcal`} color={hues.accent.text} size="md" />
          <Stat boxed label="Carbs" value={r.carbs} unit={`/ ${r.carbsGoal} g`} color={hues.amber.text} size="md" />
        </View>
        <Button
          variant="secondary"
          label="Forgot to log something?"
          iconRight={<ChevronRight size={14} color={colors.ink} strokeWidth={2.6} />}
          onPress={() => router.push('/(tabs)/log')}
          style={{ alignSelf: 'stretch' }}
        />
      </Card>

      <Card outline="rgba(245, 166, 35, 0.4)" gap={10}>
        <CardHeader icon={Zap} title="Topping up for your long run" hue={hues.amber} />
        <Txt v="body">+60 g carbs before your run and again at lunch today, rather than the whole gap at once.</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Chip label="Pre-run +60 g" hue={hues.amber} />
          <Chip label="Lunch +60 g" hue={hues.amber} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(27, 26, 25, 0.08)' },
});
