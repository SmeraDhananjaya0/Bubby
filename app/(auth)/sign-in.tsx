import React, { useCallback, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Rings, Screen, Txt } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useGoogleAuth } from '@/lib/google';
import { isCloudConfigured } from '@/lib/supabase';
import { sendCode, signInWithGoogle, verifyCode } from '@/lib/useAuth';
import { colors, fonts, hues, macroHue } from '@/theme/tokens';
import type { User } from '@/types';

/**
 * Sign in.
 *  - Cloud mode (Supabase configured): Google via Supabase OAuth, or email → six-digit code.
 *    The session lands through `useAuth()` in the root layout, which signs the store in.
 *  - Local mode: Google via expo-auth-session (or a demo account), or a local email account.
 *  - Guest always works: data stays on this device.
 */
export default function SignIn() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const signInGuest = useAuthStore((s) => s.signInGuest);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
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

  const validEmail = () => {
    const e = email.trim().toLowerCase();
    if (!e.includes('@') || !e.includes('.')) {
      setError('Enter a valid email address.');
      return null;
    }
    return e;
  };

  const handleGoogle = async () => {
    setError('');
    if (isCloudConfigured) {
      setBusy(true);
      try {
        await signInWithGoogle();
        done();
      } catch (e) {
        setError(e instanceof Error && !/cancel/i.test(e.message) ? 'Google sign-in is not enabled yet — use your email below.' : '');
      } finally {
        setBusy(false);
      }
      return;
    }
    if (google.available) google.signIn();
    else {
      // No OAuth keys configured — create a local account so the app is usable.
      signIn({ id: 'google:demo', name: 'Demo Runner', email: 'demo@bubbie.run', provider: 'google' });
      done();
    }
  };

  const handleEmail = async () => {
    const e = validEmail();
    if (!e) return;
    if (!isCloudConfigured) {
      signIn({ id: `email:${e}`, name: name.trim() || e.split('@')[0], email: e, provider: 'email' });
      done();
      return;
    }
    setBusy(true);
    setError('');
    try {
      await sendCode(e);
      setStage('code');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      // The built-in mailer allows 2 emails/hour project-wide; say so instead of echoing the API.
      setError(/rate limit/i.test(msg) ? 'Our mailer is over its hourly limit. Try again in an hour — or tap “I already have a code” if you were given one.' : msg || 'Could not send the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async () => {
    const e = validEmail();
    if (!e) return;
    if (code.trim().length < 6) {
      setError('Enter the six-digit code from your email.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await verifyCode(e, code.trim());
      done();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That code did not work.');
    } finally {
      setBusy(false);
    }
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

      <Button variant="cta" label={busy && stage === 'email' ? 'Opening Google…' : 'Continue with Google'} onPress={handleGoogle} />

      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Txt v="caption" style={{ fontFamily: fonts.bold }}>OR</Txt>
        <View style={styles.line} />
      </View>

      {stage === 'email' ? (
        <>
          <View style={styles.card}>
            {!isCloudConfigured ? (
              <View style={styles.field}>
                <Txt style={styles.label}>Name</Txt>
                <TextInput value={name} onChangeText={setName} placeholder="Optional" placeholderTextColor={colors.caption} accessibilityLabel="Name" style={styles.input} selectionColor={colors.accent.fill} />
              </View>
            ) : null}
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
                autoComplete="email"
                accessibilityLabel="Email"
                style={styles.input}
                selectionColor={colors.accent.fill}
                onSubmitEditing={handleEmail}
              />
            </View>
          </View>
          {error ? <Txt style={styles.error}>{error}</Txt> : null}
          <Button
            label={isCloudConfigured ? (busy ? 'Sending…' : 'Email me a code') : 'Create account & continue'}
            onPress={handleEmail}
            style={{ height: 50, width: '100%', borderRadius: 16 }}
          />
          {isCloudConfigured ? (
            <Button variant="ghost" label="I already have a code" onPress={() => { if (validEmail()) { setStage('code'); setError(''); } }} style={{ alignSelf: 'center', marginTop: -6 }} />
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.card}>
            <View style={[styles.field, { borderBottomWidth: 0 }]}>
              <Txt style={styles.label}>Code</Txt>
              <TextInput
                value={code}
                onChangeText={(v) => {
                  setCode(v.replace(/[^0-9]/g, '').slice(0, 6));
                  if (error) setError('');
                }}
                placeholder="123456"
                placeholderTextColor={colors.caption}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                accessibilityLabel="Six-digit code"
                style={[styles.input, { letterSpacing: 4, fontFamily: fonts.extrabold, fontSize: 20 }]}
                selectionColor={colors.accent.fill}
                onSubmitEditing={handleVerify}
                autoFocus
              />
            </View>
          </View>
          <Txt v="caption" style={{ textAlign: 'center' }}>Enter the six-digit code for {email.trim()}.</Txt>
          {error ? <Txt style={styles.error}>{error}</Txt> : null}
          <Button label={busy ? 'Checking…' : 'Verify & continue'} onPress={handleVerify} style={{ height: 50, width: '100%', borderRadius: 16 }} />
          <Button variant="ghost" label="Use a different email" onPress={() => { setStage('email'); setCode(''); setError(''); }} style={{ alignSelf: 'center' }} />
        </>
      )}

      <Button variant="ghost" label="Continue as guest" onPress={() => { signInGuest(); done(); }} style={{ alignSelf: 'center', marginTop: 2 }} />

      <Txt v="caption" style={{ textAlign: 'center', paddingHorizontal: 16, marginTop: 2 }}>
        {isCloudConfigured
          ? 'No password. Your plan, logs and coach sync across devices. Guests keep everything on this device only.'
          : google.available
            ? 'We only read your name and email to set up your account.'
            : 'Running without a backend — accounts live on this device. Add the Supabase env to sync.'}
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
