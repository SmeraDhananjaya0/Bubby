import React, { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Gauge } from 'lucide-react-native';
import { Button, Card, CardHeader, SegmentedControl, Txt } from '@/components';
import { FieldError, fieldStyles as f } from '@/features/onboarding/Fields';
import { describeRace, fmtClock, projectedFinish, referenceRace } from '@/lib/fitness';
import { fmtPace } from '@/lib/plan';
import { formatTimeInput, parseGoalTime, validateGoalTime } from '@/lib/validate';
import { colors, hues } from '@/theme/tokens';
import type { Profile, Race, RecentRace, RunHistory } from '@/types';

const DISTS = [
  { key: '1mi', label: '1 mi', mi: 1 },
  { key: '5k', label: '5K', mi: 3.1 },
  { key: '10k', label: '10K', mi: 6.2 },
  { key: 'half', label: 'Half', mi: 13.1 },
  { key: 'full', label: 'Full', mi: 26.2 },
];
const keyFor = (mi?: number) => DISTS.find((d) => Math.abs(d.mi - (mi ?? 0)) < 0.05)?.key ?? '5k';
const raceWord = (d: Race['distance']) => (d === 'Half' ? 'half' : d === 'Marathon' ? 'marathon' : d);

type Props = {
  profile: Profile;
  history: RunHistory | null;
  /** The goal race, for the projected finish line. */
  distance: Race['distance'];
  /** A typed-in race (manual), or undefined to fall back to Strava / the goal time. */
  onChange: (race: RecentRace | undefined) => void;
};

/**
 * "Current fitness": the reference race the paces hang off. Strava's best recent effort by default,
 * or a race / time trial the runner types in. Nothing at all is fine too — paces then come from the goal.
 */
export function FitnessCard({ profile, history, distance, onChange }: Props) {
  const manual = profile.recentRace?.source === 'manual' ? profile.recentRace : undefined;
  const strava = history?.bestEffort ?? null;
  const [typing, setTyping] = useState(!!manual || !strava);
  const [distKey, setDistKey] = useState(keyFor(manual?.distanceMi));
  const [time, setTime] = useState(manual ? fmtClock(manual.seconds) : '');
  const mi = DISTS.find((d) => d.key === distKey)!.mi;
  const error = time ? validateGoalTime(time, mi) : null;

  // Commit a valid manual race upward; an empty or invalid one falls back.
  useEffect(() => {
    if (!typing) return;
    const secs = parseGoalTime(time);
    if (secs && !validateGoalTime(time, mi)) onChange({ distanceMi: mi, seconds: secs, source: 'manual' });
    else if (manual) onChange(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing, time, mi]);

  const ref = referenceRace(profile, history);
  const projection = ref ? `Projects to about ${fmtClock(projectedFinish(ref, distance))} for the ${raceWord(distance)}.` : null;
  const useStrava = () => { setTyping(false); setTime(''); onChange(undefined); };

  return (
    <Card gap={12}>
      <CardHeader icon={Gauge} title="Current fitness" hue={hues.teal} meta={typing ? 'A recent race' : 'From Strava'} />
      {typing ? (
        <>
          <SegmentedControl compact options={DISTS.map((d) => ({ key: d.key, label: d.label }))} value={distKey} onChange={setDistKey} />
          <View style={[f.row, { borderBottomWidth: 0, paddingVertical: 8 }]}>
            <Txt style={f.label}>Time</Txt>
            <TextInput
              value={time}
              onChangeText={(t) => setTime(formatTimeInput(t))}
              accessibilityLabel="Recent race time"
              keyboardType="numbers-and-punctuation"
              placeholder={mi >= 13 ? 'H:MM:SS' : 'MM:SS'}
              placeholderTextColor={colors.caption}
              style={[f.input, { minWidth: 120 }, error ? { color: hues.amber.text } : null]}
              selectionColor={colors.accent.fill}
            />
          </View>
          <FieldError text={error} />
          <Txt v="caption">{projection ?? 'A recent race or a hard time trial. Leave it blank and paces come from your goal time.'}</Txt>
          {strava ? <Button variant="ghost" label="Use Strava instead" onPress={useStrava} style={{ alignSelf: 'flex-start' }} /> : null}
        </>
      ) : (
        <>
          <Txt v="bodyMuted">
            {history ? `${history.weeklyAvg} mi/wk · avg ${history.avgPaceSec ? fmtPace(history.avgPaceSec) : '—'} /mi · fastest ${describeRace(strava!)}` : ''}
          </Txt>
          {projection ? <Txt v="caption">{projection}</Txt> : null}
          <Button variant="ghost" label="Use a race instead" onPress={() => setTyping(true)} style={{ alignSelf: 'flex-start' }} />
        </>
      )}
    </Card>
  );
}
