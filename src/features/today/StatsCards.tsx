import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Activity, TrendingUp } from 'lucide-react-native';
import { Card, CardFooter, CardHeader, Chip, SegmentedControl, Stat, StatRow, TrendChart, Txt, WeekBars } from '@/components';
import { sampleLastWeekNoRace, sampleThisWeekNoRace, sampleTrend } from '@/data/sample';
import { hues } from '@/theme/tokens';

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** This week vs. last week — the no-race home hero. */
export function ThisWeekCard() {
  const total = sampleThisWeekNoRace.reduce((a, b) => a + b, 0);
  const last = sampleLastWeekNoRace.reduce((a, b) => a + b, 0);
  const delta = Math.round(((total - last) / last) * 100);
  return (
    <Card>
      <CardHeader icon={Activity} title="This week" hue={hues.teal} meta="Mon – Sun" />
      <View style={styles.between}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Txt v="hero">{total.toFixed(1)}</Txt>
          <Txt v="captionBold" style={{ fontSize: 16 }}>mi</Txt>
        </View>
        <Chip label={`${delta > 0 ? '+' : ''}${delta}% vs last week`} hue={hues.teal} icon={<TrendingUp size={13} color={hues.teal.text} strokeWidth={2.6} />} />
      </View>
      <WeekBars
        max={8}
        days={DOW.map((label, i) => ({
          label,
          value: sampleThisWeekNoRace[i],
          ghost: sampleLastWeekNoRace[i],
          color: i === 5 ? hues.teal.fill : 'rgba(34, 179, 166, 0.55)',
          today: i === 5,
        }))}
      />
      <CardFooter>
        <StatRow>
          <Stat label="Runs" value={sampleThisWeekNoRace.filter(Boolean).length} />
          <Stat label="Time" value="3h 41m" />
          <Stat label="Avg pace" value="9:00" unit="/mi" />
        </StatRow>
      </CardFooter>
    </Card>
  );
}

type Range = keyof typeof sampleTrend;
const START: Record<Range, string> = { '4W': '4 wks ago', '12W': '12 wks ago', '6M': '6 months ago' };

/** Weekly-miles trend with a 4 wks / 12 wks / 6 mo toggle. */
export function ProgressCard() {
  const [range, setRange] = useState<Range>('12W');
  const values = sampleTrend[range];
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <Card>
      <CardHeader icon={TrendingUp} title="Progress" hue={hues.violet} meta="Weekly miles" />
      <SegmentedControl
        options={[
          { key: '4W', label: '4 wks' },
          { key: '12W', label: '12 wks' },
          { key: '6M', label: '6 mo' },
        ]}
        value={range}
        onChange={setRange}
      />
      <TrendChart values={values} startLabel={START[range]} />
      <CardFooter>
        <StatRow>
          <Stat label="Total" value={Math.round(total)} unit="mi" />
          <Stat label="Avg / week" value={(total / values.length).toFixed(1)} unit="mi" />
          <Stat label="Best week" value={Math.max(...values).toFixed(1)} unit="mi" />
        </StatRow>
      </CardFooter>
    </Card>
  );
}

/** Week against plan — the race-mode home. */
export function WeekAgainstPlanCard({ week, todayIndex, todayDone }: { week: { miles: number; done?: string }[]; todayIndex: number; todayDone: boolean }) {
  const doneMiles = week.map((d, i) => (d.done ? parseFloat(d.done) : i === todayIndex && todayDone ? d.miles : 0));
  const planned = week.reduce((a, d) => a + d.miles, 0);
  const done = doneMiles.reduce((a, b) => a + b, 0);
  const runs = doneMiles.filter(Boolean).length;
  return (
    <Card>
      <CardHeader icon={TrendingUp} title="This week" hue={hues.teal} meta="Mon – Sun" />
      <View style={styles.between}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Txt v="heroSm">{done.toFixed(1)}</Txt>
          <Txt v="captionBold" style={{ fontSize: 15 }}>of {planned} mi</Txt>
        </View>
        <Chip label={`${Math.round((done / planned) * 100)}% of plan`} hue={hues.teal} />
      </View>
      <WeekBars
        max={Math.max(...week.map((d) => d.miles))}
        days={week.map((d, i) => ({
          label: DOW[i],
          value: doneMiles[i],
          ghost: d.miles,
          color: i === todayIndex ? hues.accent.fill : hues.teal.fill,
          today: i === todayIndex,
        }))}
      />
      <CardFooter>
        <StatRow>
          <Stat label="Runs" value={`${runs}`} unit={`of ${week.filter((d) => d.miles > 0).length}`} />
          <Stat label="Time" value="3h 26m" />
          <Stat label="Avg pace" value="9:04" unit="/mi" />
        </StatRow>
      </CardFooter>
    </Card>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
});
