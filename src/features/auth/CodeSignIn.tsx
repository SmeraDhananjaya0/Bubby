import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Txt } from '@/components';
import { members, type Member } from '@/data/members';
import { signInWithCode } from '@/lib/useAuth';
import { colors, fonts, hues } from '@/theme/tokens';

const CODE_LENGTH = 8;
/** Codes are stored without the hyphen; show `XXXX-XXXX` while typing. */
const pretty = (c: string) => (c.length > 4 ? `${c.slice(0, 4)}-${c.slice(4)}` : c);

/** Cloud sign-in: pick your name, enter your personal code. No email involved. */
export function CodeSignIn() {
  const router = useRouter();
  const [member, setMember] = useState<Member>(members[0]);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (code.length < CODE_LENGTH) {
      setError(`Codes are ${CODE_LENGTH} characters.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await signInWithCode(member.email, code);
      router.replace('/');
    } catch {
      setError(`That isn't ${member.name}'s code.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={styles.card}>
        <View style={styles.field}>
          <Txt style={styles.label}>Runner</Txt>
          <View style={styles.pills}>
            {members.map((m) => {
              const on = m.id === member.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => { setMember(m); setError(''); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.pill, on && styles.pillOn]}
                >
                  <Txt style={[styles.pillText, on && { color: colors.white }]}>{m.name}</Txt>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={[styles.field, { borderBottomWidth: 0 }]}>
          <Txt style={styles.label}>Code</Txt>
          <TextInput
            value={pretty(code)}
            onChangeText={(v) => {
              setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH));
              if (error) setError('');
            }}
            placeholder="XXXX-XXXX"
            placeholderTextColor={colors.caption}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            accessibilityLabel="Your code"
            style={styles.input}
            selectionColor={colors.accent.fill}
            onSubmitEditing={submit}
          />
        </View>
      </View>
      {error ? <Txt style={styles.error}>{error}</Txt> : null}
      <Button label={busy ? 'Checking…' : 'Continue'} onPress={submit} style={{ height: 50, width: '100%', borderRadius: 16 }} />
      <Txt v="caption" style={{ textAlign: 'center', paddingHorizontal: 16 }}>
        Each runner has a personal code — nothing is emailed. Your plan, logs and coach sync across devices.
      </Txt>
    </>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, paddingHorizontal: 16, boxShadow: '0 1px 2px rgba(27, 26, 25, 0.04), 0 10px 30px rgba(27, 26, 25, 0.05)' },
  field: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  label: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink2, width: 64 },
  pills: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  pill: { height: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.hairline, alignItems: 'center', justifyContent: 'center' },
  pillOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  input: { flex: 1, textAlign: 'right', fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: 2, color: colors.ink, padding: 0, height: 44 },
  error: { fontFamily: fonts.semibold, fontSize: 13, color: hues.accent.text, textAlign: 'center', marginTop: -4 },
});
