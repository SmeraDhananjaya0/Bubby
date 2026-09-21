import React, { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BackButton, Button, Card, Screen, SegmentedControl, StepIndicator, Txt } from '@/components';
import { FieldError, NumberField, fieldStyles as f } from '@/features/onboarding/Fields';
import { useAppStore } from '@/store/useAppStore';
import { validateProfile } from '@/lib/validate';
import { colors } from '@/theme/tokens';
import type { Level } from '@/types';

const LEVELS: { key: Level; label: string }[] = [
  { key: 'new', label: 'New' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

/** Step 2 (and the Settings profile screen): body, heart rate, experience, and anything the coach should know. */
export default function AboutYou() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const history = useAppStore((s) => s.history);
  const setProfile = useAppStore((s) => s.setProfile);
  const onboarded = useAppStore((s) => s.onboarded);
  const [feet, setFeet] = useState(String(Math.floor(profile.heightIn / 12)));
  const [inches, setInches] = useState(String(profile.heightIn % 12));

  // Max HR: what Strava has seen, else the age estimate — filled in once so the plan gets heart-rate zones.
  const [hrSource] = useState<'you' | 'strava' | 'age'>(profile.maxHr ? 'you' : history?.maxHr ? 'strava' : 'age');
  useEffect(() => {
    if (!profile.maxHr) setProfile({ maxHr: history?.maxHr ?? 220 - profile.age });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commitHeight = (ft: string, inch: string) => {
    const total = (Number(ft) || 0) * 12 + (Number(inch) || 0);
    if (total > 0) setProfile({ heightIn: total });
  };

  const errors = {
    age: validateProfile.age(profile.age),
    heightIn: validateProfile.heightIn(profile.heightIn),
    weightLb: validateProfile.weightLb(profile.weightLb),
    maxHr: profile.maxHr == null ? null : validateProfile.maxHr(profile.maxHr),
    restingHr: profile.restingHr == null ? null : validateProfile.restingHr(profile.restingHr),
  };
  const valid = Object.values(errors).every((e) => !e);
  const next = () => (onboarded ? (router.canGoBack() ? router.back() : router.replace('/(tabs)/today')) : router.push('/(onboarding)/goal'));

  return (
    <Screen ambient="onboarding" bottomPad={130} footer={<Button variant="cta" label={onboarded ? 'Done' : 'Continue'} disabled={!valid} onPress={next} />}>
      {onboarded ? <BackButton fallback="/(tabs)/today" /> : <StepIndicator step={2} />}
      <View style={{ gap: 4, marginBottom: 6 }}>
        <Txt v="eyebrow">{onboarded ? 'Profile' : 'Step 2 of 4'}</Txt>
        <Txt v="title">About you</Txt>
      </View>

      <Card gap={0} style={{ paddingTop: 6, paddingBottom: 6 }}>
        <NumberField label="Age" value={profile.age} onCommit={(age) => setProfile({ age })} width={60} />
        <FieldError text={errors.age} />
        <View style={f.row}>
          <Txt style={f.label}>Sex</Txt>
          <SegmentedControl
            compact
            options={[
              { key: 'Female', label: 'Female' },
              { key: 'Male', label: 'Male' },
              { key: 'Other', label: 'Other' },
            ]}
            value={(profile.sex || 'Other') as 'Female' | 'Male' | 'Other'}
            onChange={(sex) => setProfile({ sex })}
          />
        </View>
        <View style={f.row}>
          <Txt style={f.label}>Height</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <TextInput value={feet} onChangeText={(t) => { const c = t.replace(/[^0-9]/g, ''); setFeet(c); commitHeight(c, inches); }} keyboardType="numeric" accessibilityLabel="Height in feet" style={[f.input, { minWidth: 28 }]} selectionColor={colors.accent.fill} />
            <Txt style={f.unit}>ft</Txt>
            <TextInput value={inches} onChangeText={(t) => { const c = t.replace(/[^0-9]/g, ''); setInches(c); commitHeight(feet, c); }} keyboardType="numeric" accessibilityLabel="Height in inches" style={[f.input, { minWidth: 28, marginLeft: 8 }]} selectionColor={colors.accent.fill} />
            <Txt style={f.unit}>in</Txt>
          </View>
        </View>
        <FieldError text={errors.heightIn} />
        <NumberField label="Weight" value={profile.weightLb} unit="lb" onCommit={(weightLb) => setProfile({ weightLb })} />
        <FieldError text={errors.weightLb} />
        <View style={[f.row, f.stack, { borderBottomWidth: 0 }]}>
          <Txt style={f.label}>Diet or allergies</Txt>
          <TextInput value={profile.diet} onChangeText={(diet) => setProfile({ diet })} placeholder="e.g. vegetarian, no peanuts" placeholderTextColor={colors.caption} accessibilityLabel="Diet or allergies" style={f.textField} />
        </View>
      </Card>

      <Card gap={0} style={{ paddingTop: 6, paddingBottom: 6 }}>
        <NumberField label="Max HR" value={profile.maxHr ?? 220 - profile.age} unit="bpm" onCommit={(maxHr) => setProfile({ maxHr })} width={70} />
        <Txt style={f.hint}>{hrSource === 'strava' ? 'The highest Strava has seen on your runs. Edit if you know your true max.' : hrSource === 'age' ? 'Estimated as 220 − age. Edit if you know your true max.' : 'Sets your heart-rate zones.'}</Txt>
        <FieldError text={errors.maxHr} />
        <NumberField label="Resting HR" value={profile.restingHr} unit="bpm" placeholder="—" onCommit={(restingHr) => setProfile({ restingHr })} onClear={() => setProfile({ restingHr: undefined })} width={70} />
        <Txt style={f.hint}>Optional. Sharpens the zones (morning pulse, or from your watch).</Txt>
        <FieldError text={errors.restingHr} />
        <View style={[f.row, { borderBottomWidth: 0 }]}>
          <Txt style={f.label}>Level</Txt>
          <SegmentedControl compact options={LEVELS} value={profile.level ?? 'intermediate'} onChange={(level) => setProfile({ level })} />
        </View>
      </Card>

      <Card gap={0} style={{ paddingTop: 6, paddingBottom: 6 }}>
        <View style={[f.row, f.stack, { borderBottomWidth: 0 }]}>
          <Txt style={f.label}>Anything the coach should know</Txt>
          <TextInput
            value={profile.notes ?? ''}
            onChangeText={(notes) => setProfile({ notes })}
            placeholder="Injuries, schedule, constraints — e.g. Achilles has been sore, no runs on Tuesdays"
            placeholderTextColor={colors.caption}
            accessibilityLabel="Anything the coach should know"
            multiline
            maxLength={500}
            style={f.textArea}
          />
        </View>
      </Card>

      <Txt v="bodyMuted" style={{ paddingHorizontal: 4 }}>
        Body sets your calorie baseline and protein; max HR sets your zones; level shapes how fast mileage builds. Change any of it later in Settings.
      </Txt>
    </Screen>
  );
}
