import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ArrowRight, Check, Mic, Sparkles } from 'lucide-react-native';
import { Button, Card, Chip, Header, IconCircle, Screen, Stat, Txt } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { coachChanges } from '@/data/sample';
import { todayLabel } from '@/lib/format';
import { colors, fonts, hues } from '@/theme/tokens';

function CoachMsg({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.coachRow}>
      <IconCircle icon={Sparkles} hue={hues.violet} size={28} iconSize={14} />
      <View style={{ flex: 1, gap: 12 }}>{children}</View>
    </View>
  );
}

function YouMsg({ children }: { children: string }) {
  return (
    <View style={{ alignItems: 'flex-end' }}>
      <View style={styles.youBubble}>
        <Txt v="body" color={colors.white}>{children}</Txt>
      </View>
    </View>
  );
}

/** Coach tab: the injury conversation with a working "Update my plan". */
export default function Coach() {
  const applied = useAppStore((s) => s.coachApplied);
  const setApplied = useAppStore((s) => s.setCoachApplied);

  return (
    <Screen
      ambient="coach"
      bottomPad={176}
      contentStyle={{ gap: 18 }}
      footer={
        <View style={styles.composerWrap}>
          <View style={styles.composer}>
            <TextInput placeholder="Tell your coach anything" placeholderTextColor={colors.caption} style={styles.input} accessibilityLabel="Message your coach" />
            <Pressable accessibilityRole="button" accessibilityLabel="Dictate" style={styles.mic}>
              <Mic size={18} color={colors.caption} strokeWidth={2.2} />
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Send" style={styles.send}>
            <ArrowRight size={20} color={colors.white} strokeWidth={2.6} />
          </Pressable>
        </View>
      }
    >
      <Header eyebrow={todayLabel()} title="Coach" />

      <CoachMsg>
        <Txt v="body" style={{ paddingTop: 3 }}>Morning! Long run today · 16 mi in zone 2. How are you feeling?</Txt>
      </CoachMsg>

      <YouMsg>hey i hurt my knee, can't work out today or the next three days. pls update my training plan</YouMsg>

      <CoachMsg>
        <Txt v="body" style={{ paddingTop: 3 }}>Sorry about the knee. Here's what I'd change:</Txt>
        <Card gap={0} style={{ paddingTop: 6, paddingBottom: 6, paddingHorizontal: 16, borderRadius: 20 }}>
          {coachChanges.map((c, i) => (
            <View key={i} style={[styles.change, i > 0 && { borderTopWidth: 1, borderTopColor: colors.hairline }]}>
              <Txt style={{ width: 34, fontFamily: fonts.bold, fontSize: 12, color: colors.caption }}>{c.day}</Txt>
              <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
                <Txt style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.caption, textDecorationLine: 'line-through' }}>{c.from}</Txt>
                <ArrowRight size={12} color={colors.caption} strokeWidth={2.6} />
                <Txt style={{ fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink }}>{c.to}</Txt>
              </View>
            </View>
          ))}
        </Card>
        {!applied ? (
          <Button label="Update my plan" onPress={() => setApplied(true)} style={{ alignSelf: 'flex-start', paddingHorizontal: 20 }} />
        ) : (
          <Chip label="Applied" hue={hues.teal} size="md" icon={<Check size={13} color={hues.teal.text} strokeWidth={2.8} />} style={{ alignSelf: 'flex-start', height: 30 }} />
        )}
        <Txt v="small" style={{ color: colors.caption, fontFamily: fonts.medium }}>
          If it's swollen, locking, or you can't put weight on it, get it checked by a doctor or physio before running again.
        </Txt>
      </CoachMsg>

      {applied ? (
        <>
          <CoachMsg>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingBottom: 12, paddingHorizontal: 14, borderRadius: 18 }}>
              <IconCircle icon={Check} hue={hues.teal} size={36} strokeWidth={2.8} />
              <View style={{ gap: 2 }}>
                <Txt style={{ fontFamily: fonts.extrabold, fontSize: 15 }}>Plan updated</Txt>
                <Txt v="small" style={{ fontFamily: fonts.medium }}>4 rest days · back Wed with an easy 3 mi</Txt>
              </View>
            </Card>
            <Txt v="body">I'll check in Tuesday night to see how the knee feels before we restart.</Txt>
          </CoachMsg>

          <YouMsg>ok what should i eat today then</YouMsg>

          <CoachMsg>
            <Txt v="body" style={{ paddingTop: 3 }}>Today is a rest day now, so less fuel, same protein:</Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Card style={{ flex: 1, paddingTop: 12, paddingBottom: 12, paddingHorizontal: 14 }} gap={4}>
                <Stat label="Calories" value="2,300" unit="kcal" color={hues.accent.text} size="md" />
              </Card>
              <Card style={{ flex: 1, paddingTop: 12, paddingBottom: 12, paddingHorizontal: 14 }} gap={4}>
                <Stat label="Protein" value="130" unit="g" color={hues.teal.text} size="md" />
              </Card>
            </View>
            <Txt v="body">Spread protein across four meals and get calcium and vitamin D in. Carbs drop to about 250 g since you're not running.</Txt>
          </CoachMsg>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  coachRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  youBubble: { maxWidth: 300, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, borderBottomRightRadius: 6, backgroundColor: colors.ink },
  change: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  composerWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', marginBottom: 76 },
  composer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingLeft: 18,
    paddingRight: 8,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    boxShadow: '0 1px 2px rgba(27, 26, 25, 0.06), 0 10px 30px rgba(27, 26, 25, 0.08)',
  },
  input: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, padding: 0 },
  mic: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  send: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(27, 26, 25, 0.16)' },
});
