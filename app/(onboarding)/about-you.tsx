import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Screen, SegmentedControl, StepIndicator, Txt } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { colors, fonts } from '@/theme/tokens';

function Field({ label, value, onChange, keyboard }: { label: string; value: string; onChange: (v: string) => void; keyboard?: 'numeric' }) {
  return (
    <View style={styles.row}>
      <Txt style={styles.label}>{label}</Txt>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        accessibilityLabel={label}
        style={styles.input}
        selectionColor={colors.accent.fill}
      />
    </View>
  );
}

export default function AboutYou() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const feet = Math.floor(profile.heightIn / 12);
  const inches = profile.heightIn % 12;

  return (
    <Screen ambient="onboarding" bottomPad={130} footer={<Button variant="cta" label="Continue" onPress={() => router.push('/(onboarding)/goal')} />}>
      <StepIndicator step={2} />
      <View style={{ gap: 4, marginBottom: 6 }}>
        <Txt v="eyebrow">Step 2 of 4</Txt>
        <Txt v="title">About you</Txt>
      </View>

      <Card gap={0} style={{ paddingTop: 6, paddingBottom: 6 }}>
        <Field label="Age" value={String(profile.age)} keyboard="numeric" onChange={(v) => setProfile({ age: Number(v) || 0 })} />
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
        <Field label="Height" value={`${feet} ft ${inches} in`} onChange={() => {}} />
        <Field label="Weight" value={`${profile.weightLb} lb`} onChange={(v) => setProfile({ weightLb: parseInt(v, 10) || profile.weightLb })} />
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
        Used only to set your calorie and protein baseline. You can change any of this later.
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
  input: { minWidth: 120, textAlign: 'right', fontFamily: fonts.extrabold, fontSize: 20, color: colors.ink, padding: 0 },
  textField: { height: 44, paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.field, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
});
