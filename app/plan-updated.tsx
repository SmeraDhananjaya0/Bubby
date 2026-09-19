import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Calendar, Flame, X, Zap } from 'lucide-react-native';
import { Button, Card, CardHeader, Chip, Header, IconCircle, Screen, Stat, Txt } from '@/components';
import { samplePlanUpdate } from '@/data/sample';
import { colors, fonts, hues } from '@/theme/tokens';

function Row({ label, children, first }: { label: string; children: React.ReactNode; first?: boolean }) {
  return (
    <View style={[styles.row, !first && { borderTopWidth: 1, borderTopColor: colors.hairline }]}>
      <Txt style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink2 }}>{label}</Txt>
      {children}
    </View>
  );
}

/** Push-in sheet after a run syncs from Strava and changes today's fuel + the week. */
export default function PlanUpdated() {
  const router = useRouter();
  const u = samplePlanUpdate;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/today'));
  return (
    <Screen
      ambient="today"
      bottomPad={150}
      footer={
        <>
          <Button variant="cta" label="Got it" onPress={close} />
          <Button variant="ghost" label="Keep the original plan" onPress={close} style={{ marginTop: -4 }} />
        </>
      }
    >
      <Header
        eyebrow="New from Strava"
        title="Plan updated"
        right={
          <Pressable onPress={close} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
            <X size={16} color={colors.ink} strokeWidth={2.4} />
          </Pressable>
        }
      />

      <Card gap={4} style={{ paddingBottom: 6 }}>
        <View style={[styles.between, { marginBottom: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconCircle icon={Zap} hue={hues.accent} size={44} iconSize={20} />
            <View>
              <Txt v="bodyMuted">{u.run.title}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Txt style={{ fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 32, letterSpacing: -0.9, color: hues.accent.text }}>{u.run.miles}</Txt>
                <Txt v="captionBold" style={{ fontSize: 13 }}>mi</Txt>
              </View>
            </View>
          </View>
          <Txt v="cardMeta">Just now</Txt>
        </View>
        <Row label="Planned" first>
          <Txt v="label">{u.run.planned}</Txt>
        </Row>
        <Row label="Avg heart rate">
          <Txt style={{ fontFamily: fonts.extrabold, fontSize: 15, color: hues.accent.text }}>
            {u.run.avgHr} <Txt v="small" style={{ color: colors.caption }}>vs {u.run.plannedHr} planned</Txt>
          </Txt>
        </Row>
        <Row label="Time in zone 4+">
          <Txt style={{ fontFamily: fonts.extrabold, fontSize: 15, color: hues.accent.text }}>{u.run.zone4Min} min</Txt>
        </Row>
      </Card>

      <Card>
        <CardHeader icon={Flame} title="Today, we added" hue={hues.accent} meta="Harder run, more fuel" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat boxed label="Calories" value={`+${u.added.kcal}`} color={hues.accent.text} size="md" />
          <Stat boxed label="Carbs" value={`+${u.added.carbs}`} unit="g" color={hues.amber.text} size="md" />
          <Stat boxed label="Sodium" value={`+${u.added.sodiumMg}`} unit="mg" color={hues.sky.text} size="md" />
        </View>
        <Txt v="small" style={{ fontFamily: fonts.medium }}>Spread across lunch and dinner. Protein target is unchanged at 130 g.</Txt>
      </Card>

      <Card gap={10}>
        <CardHeader icon={Calendar} title="Tomorrow is now easy" hue={hues.sky} />
        <Txt v="body">{u.moved.why}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Chip label={u.moved.from} hue={hues.amber} style={{ opacity: 0.8 }} />
          <ArrowRight size={14} color={colors.caption} strokeWidth={2.4} />
          <Chip label={u.moved.to} hue={hues.teal} />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(27, 26, 25, 0.08)' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
});
