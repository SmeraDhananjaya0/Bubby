import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, Check, Clock } from 'lucide-react-native';
import { Button, Card, CardFooter, CardHeader, Chip, IconCircle, Txt } from '@/components';
import { selectToday, selectTomorrow, useAppStore } from '@/store/useAppStore';
import { colors, fonts, hues, workoutHue } from '@/theme/tokens';

const TYPE_LABEL: Record<string, string> = { easy: 'Easy run', recovery: 'Recovery run', intervals: 'Intervals', tempo: 'Tempo', long: 'Long run', rest: 'Rest day' };

/** Today's workout with a working "Mark as done" state. */
export function WorkoutCard() {
  const router = useRouter();
  const today = useAppStore(selectToday);
  const tomorrow = useAppStore(selectTomorrow);
  const done = useAppStore((s) => s.todayDone);
  const markTodayDone = useAppStore((s) => s.markTodayDone);
  const hue = workoutHue[today.type];
  const hours = today.miles > 0 ? `about ${Math.floor((today.miles * 9.4) / 60)}h ${Math.round((today.miles * 9.4) % 60)}m` : '';

  return (
    <Card>
      <CardHeader
        icon={Activity}
        title="Workout"
        hue={hues.violet}
        right={
          today.time ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Clock size={13} color={colors.caption} strokeWidth={2.2} />
              <Txt v="cardMeta">{today.time}</Txt>
            </View>
          ) : undefined
        }
      />

      {!done ? (
        <>
          <View style={styles.row}>
            <View style={{ gap: 2 }}>
              <Txt v="bodyMuted">
                {TYPE_LABEL[today.type]}
                {today.effort ? ` · ${today.effort}` : ''}
              </Txt>
              {today.miles > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                  <Txt v="heroSm">{today.miles}</Txt>
                  <Txt v="captionBold" style={{ fontSize: 15 }}>mi</Txt>
                </View>
              ) : (
                <Txt v="h2">Rest</Txt>
              )}
            </View>
            {today.pace ? (
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Chip label={`${today.pace} /mi`} hue={hue} size="md" style={{ height: 30 }} />
                <Txt v="caption">{hours}</Txt>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {today.miles > 0 ? <Button label="Mark as done" grow onPress={() => markTodayDone(true)} /> : null}
            <Button variant="secondary" label="This week" grow={today.miles === 0} onPress={() => router.push('/(tabs)/plan')} />
          </View>
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconCircle icon={Check} hue={hues.accent} size={44} iconSize={20} strokeWidth={2.6} />
            <View style={{ gap: 2 }}>
              <Txt v="h3">{TYPE_LABEL[today.type]} logged</Txt>
              <Txt v="bodyMuted">
                {today.miles.toFixed(1)} mi · {today.pace?.split('–')[0] ?? '9:16'} /mi avg
              </Txt>
            </View>
          </View>
          <CardFooter style={styles.row}>
            <Txt v="bodyMuted">
              Up next · <Txt style={{ fontFamily: fonts.bold, color: colors.ink }}>{tomorrow.dow}</Txt> {TYPE_LABEL[tomorrow.type]}
              {tomorrow.miles ? ` ${tomorrow.miles} mi` : ''}
            </Txt>
            <Pressable onPress={() => markTodayDone(false)} hitSlop={8}>
              <Txt style={{ fontFamily: fonts.bold, fontSize: 14, color: hues.accent.text }}>Undo</Txt>
            </Pressable>
          </CardFooter>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
});
