import React, { useCallback, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Rings, Screen, Txt } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useGoogleAuth } from '@/lib/google';
import { colors, fonts, hues, macroHue } from '@/theme/tokens';
import type { User } from '@/types';

export default function SignIn() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const signInGuest = useAuthStore((s) => s.signInGuest);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const done = useCallback(() => router.replace('/'), [router]);

  const onGoogleUser = useCallback(
    (user: User) => {
      signIn(user);
      done();
    },
    [signIn, done],
  );

  const google = useGoogleAuth(onGoogleUser);

  const handleGoogle = () => {
    if (google.available) {
      google.signIn();
    } else {
      // No OAuth keys configured yet — create a local account so the app is
      // usable. Fill in app.json → expo.extra.google to enable real Google.
      signIn({ id: 'google:demo', name: 'Demo Runner', email: 'demo@bubbie.run', provider: 'google' });
      done();
    }
  };

  const handleEmail = () => {
    const e = email.trim().toLowerCase();
    if (!e.includes('@') || !e.includes('.')) {
      setError('Enter a valid email address.');
      return;
    }
    const user: User = {
      id: `email:${e}`,
      name: name.trim() || e.split('@')[0],
      email: e,
      provider: 'email',
    };
    signIn(user);
    done();
  };

  return (
    <Screen ambient="onboarding" bottomPad={40}>
      <View style={{ alignItems: 'center', gap: 20, paddingTop: 24, marginBottom: 8 }}>
        <Rings
          size={150}
          stroke={13}
          gap={7}
          rings={[
            { pct: 0.78, color: macroHue.calories.fill, track: macroHue.calories.tint },
            { pct: 0.62, color: macroHue.carbs.fill, track: macroHue.carbs.tint },
            { pct: 0.7, color: macroHue.protein.fill, track: macroHue.protein.tint },
          ]}
        />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Txt style={styles.h1}>Train for it.</Txt>
          <Txt style={styles.h1Serif}>Eat for it.</Txt>
        </View>
        <Txt style={styles.sub}>Sign in to save your plan, logs and coach — on any device.</Txt>
      </View>

      <Button variant="cta" label="Continue with Google" onPress={handleGoogle} />

      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Txt v="caption" style={{ fontFamily: fonts.bold }}>OR</Txt>
        <View style={styles.line} />
      </View>

      <View style={styles.card}>
        <View style={styles.field}>
          <Txt style={styles.label}>Name</Txt>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Optional"
            placeholderTextColor={colors.caption}
            accessibilityLabel="Name"
            style={styles.input}
            selectionColor={colors.accent.fill}
          />
        </View>
        <View style={[styles.field, { borderBottomWidth: 0 }]}>
          <Txt style={styles.label}>Email</Txt>
          <TextInput
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (error) setError('');
            }}
            placeholder="you@email.com"
            placeholderTextColor={colors.caption}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Email"
            style={styles.input}
            selectionColor={colors.accent.fill}
            onSubmitEditing={handleEmail}
          />
        </View>
      </View>
      {error ? <Txt style={styles.error}>{error}</Txt> : null}

      <Button label="Create account & continue" onPress={handleEmail} style={{ height: 50, width: '100%', borderRadius: 16 }} />

      <Button variant="ghost" label="Continue as guest" onPress={() => { signInGuest(); done(); }} style={{ alignSelf: 'center', marginTop: 2 }} />

      <Txt v="caption" style={{ textAlign: 'center', paddingHorizontal: 16, marginTop: 2 }}>
        {google.available
          ? 'We only read your name and email to set up your account.'
          : 'Google is in demo mode until OAuth keys are added — email and guest work fully.'}
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: fonts.extrabold, fontSize: 38, lineHeight: 42, letterSpacing: -1.1, color: colors.ink },
  h1Serif: { fontFamily: fonts.serifItalic, fontSize: 42, lineHeight: 44, letterSpacing: -0.5, color: colors.accent.text },
  sub: { textAlign: 'center', fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.ink2, maxWidth: 300 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 },
  line: { flex: 1, height: 1, backgroundColor: colors.hairline },
  card: { backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 16, boxShadow: '0 1px 2px rgba(27, 26, 25, 0.04), 0 10px 30px rgba(27, 26, 25, 0.05)' },
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink2, width: 64 },
  input: { flex: 1, textAlign: 'right', fontFamily: fonts.bold, fontSize: 16, color: colors.ink, padding: 0 },
  error: { fontFamily: fonts.semibold, fontSize: 13, color: hues.accent.text, textAlign: 'center', marginTop: -4 },
});
