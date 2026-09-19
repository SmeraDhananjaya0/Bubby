import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Moon, Zap } from 'lucide-react-native';
import { Card, CardHeader, Rings, Txt } from '@/components';
import { selectTomorrow, useAppStore } from '@/store/useAppStore';
import { targetsFor } from '@/lib/fuel';
import { n } from '@/lib/format';
import { samplePersonalBests, sampleRecovery } from '@/data/sample';
import { colors, fonts, hues } from '@/theme/tokens';

const TYPE_LABEL: Record<string, string> = { easy: 'Easy', recovery: 'Recovery', intervals: 'Intervals', tempo: 'Tempo', long: 'Long', rest: 'Rest' };

/** Tomorrow's workout and its calorie target — a tap opens the week. */
export function TomorrowCard() {
  const router = useRouter();
  const tomorrow = useAppStore(selectTomorrow);
  const profile = useAppStore((s) => s.profile);
  const t = targetsFor(tomorrow, profile);
  return (
    <Card gap={12} onPress={() => router.push('/(tabs)/plan')}>
      <CardHeader icon={Calendar} title="Tomorrow" hue={hues.sky} link={{ label: tomorrow.dow, onPress: () => router.push('/(tabs)/plan') }} />
      <View style={styles.between}>
        <View style={{ gap: 2 }}>
          <Txt v="h3">
            {TYPE_LABEL[tomorrow.type]}
            {tomorrow.miles ? ` · ${tomorrow.miles} mi` : ''}
          </Txt>
          <Txt v="small" style={{ color: colors.ink2, fontFamily: fonts.medium }}>
            {tomorrow.type === 'rest' ? 'Low day, lighter fuel' : tomorrow.type === 'long' ? 'Big day, carbs go up' : 'Easy day, lighter fuel'}
          </Txt>
        </View>
        <Txt style={{ fontFamily: fonts.extrabold, fontSize: 17, color: hues.accent.text }}>
          {n(t.kcal)} <Txt v="captionBold">kcal</Txt>
        </Txt>
      </View>
    </Card>
  );
}

/** Sleep / HRV / resting HR with a readiness gauge. */
export function RecoveryCard() {
  const r = sampleRecovery;
  return (
    <Card>
      <CardHeader icon={Moon} title="Recovery" hue={hues.violet} meta="Last night" />
      <View style={styles.between}>
        <View style={{ gap: 4, flex: 1 }}>
          <Txt v="h2" style={{ fontSize: 24, lineHeight: 28 }}>{r.label}</Txt>
          <Txt v="bodyMuted">
            Sleep {r.sleep} · HRV {r.hrv} ms · RHR {r.rhr}
          </Txt>
        </View>
        <Rings size={64} stroke={7} rings={[{ pct: r.score / 100, color: hues.violet.fill, track: colors.track }]}>
          <Txt style={{ fontFamily: fonts.extrabold, fontSize: 18, color: hues.violet.text }}>{r.score}</Txt>
        </Rings>
      </View>
    </Card>
  );
}

/** All-time bests — the no-race home. */
export function PersonalBestsCard() {
  return (
    <Card>
      <CardHeader icon={Zap} title="Personal bests" hue={hues.amber} meta="All time" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {samplePersonalBests.map((pb) => (
          <View key={pb.label} style={styles.pb}>
            <Txt v="captionBold">{pb.label}</Txt>
            <Txt style={{ fontFamily: fonts.extrabold, fontSize: 18, letterSpacing: -0.36, color: colors.ink }}>{pb.time}</Txt>
            <Txt v="caption" style={{ fontSize: 11, fontFamily: fonts.semibold }}>{pb.when}</Txt>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  pb: { flex: 1, gap: 4, padding: 12, borderRadius: 16, backgroundColor: colors.tint },
});
