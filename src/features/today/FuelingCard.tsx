import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, Zap } from 'lucide-react-native';
import { Card, CardHeader, Chip, Txt } from '@/components';
import { selectToday, useAppStore } from '@/store/useAppStore';
import { protocolFor } from '@/lib/fuel';
import { colors, fonts, hues } from '@/theme/tokens';

function Row({ label, value, color, last }: { label: string; value: string; color: string; last?: boolean }) {
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Txt style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink2 }}>{label}</Txt>
      <Txt style={{ fontFamily: fonts.extrabold, fontSize: 15, color }}>{value}</Txt>
    </View>
  );
}

/** Before / during / after protocol for today's run, plus what to carry. */
export function FuelingCard() {
  const router = useRouter();
  const today = useAppStore(selectToday);
  const p = protocolFor(today);
  if (!p) return null;

  return (
    <Card gap={4} style={{ paddingBottom: 8 }}>
      <CardHeader icon={Zap} title="Fueling" hue={hues.amber} meta="For this run" />
      <View style={{ marginTop: 6 }}>
        <Row label="Before" value={p.before} color={hues.amber.text} />
        <Row label="During" value={p.during} color={hues.amber.text} />
        <Row label="After" value={p.after} color={hues.teal.text} last={p.carry.length === 0} />
      </View>
      {p.carry.length > 0 ? (
        <View style={styles.carry}>
          <View style={styles.between}>
            <Txt v="micro" color={hues.amber.text}>
              Carry for {today.miles} mi
            </Txt>
            <Pressable onPress={() => router.push('/(tabs)/log')} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Txt style={{ fontFamily: fonts.bold, fontSize: 12, color: hues.amber.text }}>Log run fuel</Txt>
              <ChevronRight size={12} color={hues.amber.text} strokeWidth={2.6} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {p.carry.map((c) => (
              <Chip key={c} label={c} onTint />
            ))}
          </View>
          {p.timing ? <Txt style={{ fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: '#7A4600' }}>{p.timing}</Txt> : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  carry: { marginTop: 8, marginBottom: 10, padding: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(245, 166, 35, 0.12)', gap: 8 },
});
