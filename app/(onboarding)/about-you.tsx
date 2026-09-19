import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Screen, SegmentedControl, StepIndicator, Txt } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { colors, fonts } from '@/theme/tokens';

/** A right-aligned numeric field with a fixed unit suffix. Keeps its own text
 *  state so typing (and clearing) feels natural, committing numbers upward. */
function NumberField({ label, value, unit, onCommit, width = 90 }: { label: string; value: number; unit?: string; onCommit: (n: number) => void; width?: number }) {
  const [text, setText] = useState(String(value));
  return (
    <View style={styles.row}>
      <Txt style={styles.label}>{label}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <TextInput
          value={text}
          onChangeText={(t) => {
            const clean = t.replace(/[^0-9]/g, '');
            setText(clean);
            if (clean) onCommit(Number(clean));
          }}
          keyboardType="numeric"
          accessibilityLabel={label}
          style={[styles.input, { minWidth: width }]}
          selectionColor={colors.accent.fill}
        />
        {unit ? <Txt style={styles.unit}>{unit}</Txt> : null}
      </View>
    </View>
  );
}

export default function AboutYou() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const [feet, setFeet] = useState(String(Math.floor(profile.heightIn / 12)));
  const [inches, setInches] = useState(String(profile.heightIn % 12));

  const commitHeight = (f: string, i: string) => {
    const total = (Number(f) || 0) * 12 + (Number(i) || 0);
    if (total > 0) setProfile({ heightIn: total });
  };

  return (
    <Screen ambient="onboarding" bottomPad={130} footer={<Button variant="cta" label="Continue" onPress={() => router.push('/(onboarding)/goal')} />}>
      <StepIndicator step={2} />
      <View style={{ gap: 4, marginBottom: 6 }}>
        <Txt v="eyebrow">Step 2 of 4</Txt>
        <Txt v="title">About you</Txt>
      </View>

      <Card gap={0} style={{ paddingTop: 6, paddingBottom: 6 }}>
        <NumberField label="Age" value={profile.age} onCommit={(age) => setProfile({ age })} width={60} />
        <View style={styles.row}>
          <Txt style={styles.label}>Sex</Txt>
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
        <View style={styles.row}>
          <Txt style={styles.label}>Height</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <TextInput
              value={feet}
              onChangeText={(t) => { const c = t.replace(/[^0-9]/g, ''); setFeet(c); commitHeight(c, inches); }}
              keyboardType="numeric"
              accessibilityLabel="Height in feet"
              style={[styles.input, { minWidth: 28 }]}
              selectionColor={colors.accent.fill}
            />
            <Txt style={styles.unit}>ft</Txt>
            <TextInput
              value={inches}
              onChangeText={(t) => { const c = t.replace(/[^0-9]/g, ''); setInches(c); commitHeight(feet, c); }}
              keyboardType="numeric"
              accessibilityLabel="Height in inches"
              style={[styles.input, { minWidth: 28, marginLeft: 8 }]}
              selectionColor={colors.accent.fill}
            />
            <Txt style={styles.unit}>in</Txt>
          </View>
        </View>
        <NumberField label="Weight" value={profile.weightLb} unit="lb" onCommit={(weightLb) => setProfile({ weightLb })} />
        <View style={[styles.row, { flexDirection: 'column', alignItems: 'stretch', gap: 8, borderBottomWidth: 0 }]}>
          <Txt style={styles.label}>Diet or allergies</Txt>
          <TextInput
            value={profile.diet}
            onChangeText={(diet) => setProfile({ diet })}
            placeholder="e.g. vegetarian, no peanuts"
            placeholderTextColor={colors.caption}
            accessibilityLabel="Diet or allergies"
            style={styles.textField}
          />
        </View>
      </Card>

      <Txt v="bodyMuted" style={{ paddingHorizontal: 4 }}>
        Used only to set your calorie and protein baseline. You can change any of this later in Settings.
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink2 },
  input: { textAlign: 'right', fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink, padding: 0 },
  unit: { fontFamily: fonts.bold, fontSize: 14, color: colors.caption },
  textField: { height: 44, paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.field, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
});
