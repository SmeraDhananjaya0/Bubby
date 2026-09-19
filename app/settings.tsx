import React from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Flag, LogOut, RotateCcw, User as UserIcon, UtensilsCrossed } from 'lucide-react-native';
import { Card, CardHeader, IconCircle, Screen, Txt } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, fonts, hues } from '@/theme/tokens';

function Row({ icon, label, meta, hue, onPress, danger }: { icon: any; label: string; meta?: string; hue: typeof hues.accent; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.row} accessibilityRole="button">
      <IconCircle icon={icon} hue={hue} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={{ fontFamily: fonts.bold, fontSize: 15, color: danger ? hues.accent.text : colors.ink }}>{label}</Txt>
        {meta ? <Txt v="caption" style={{ fontFamily: fonts.medium }}>{meta}</Txt> : null}
      </View>
      <ChevronRight size={16} color={colors.caption} strokeWidth={2.4} />
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const profile = useAppStore((s) => s.profile);
  const race = useAppStore((s) => s.race);
  const hasRace = useAppStore((s) => s.hasRace);
  const reset = useAppStore((s) => s.reset);

  const providerLabel = user?.cloudId
    ? `${user.provider === 'google' ? 'Google' : 'Email'} account · synced`
    : user?.provider === 'google' ? 'Google account (this device)' : user?.provider === 'email' ? 'Email account (this device)' : 'Guest — not saved to an account';

  const onSignOut = () => {
    Alert.alert('Sign out?', user?.cloudId ? 'Your data is saved to your account and comes back when you sign in again.' : 'Your data stays on this device and comes back when you sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => { signOut(); router.replace('/'); } },
    ]);
  };

  const onReset = () => {
    Alert.alert('Reset this account?', 'Clears your plan, logs and coach thread for this account and restarts onboarding.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => { reset(); router.replace('/'); } },
    ]);
  };

  return (
    <Screen ambient="today">
      <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
        <ChevronLeft size={22} color={colors.ink} strokeWidth={2.4} />
        <Txt style={{ fontFamily: fonts.bold, fontSize: 15 }}>Back</Txt>
      </Pressable>

      <View style={{ gap: 4, marginBottom: 6 }}>
        <Txt v="eyebrow">Account</Txt>
        <Txt v="title">Settings</Txt>
      </View>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 18, paddingBottom: 18 }}>
        {user?.photo ? (
          <Image source={{ uri: user.photo }} style={styles.avatar} accessibilityIgnoresInvertColors />
        ) : (
          <View style={styles.avatarFallback}>
            <Txt style={{ fontFamily: fonts.extrabold, fontSize: 24, color: colors.ink }}>
              {user?.name?.trim()?.[0]?.toUpperCase() ?? '·'}
            </Txt>
          </View>
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <Txt style={{ fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: -0.3 }}>{user?.name ?? 'Runner'}</Txt>
          {user?.email ? <Txt v="caption" style={{ fontFamily: fonts.semibold }}>{user.email}</Txt> : null}
          <Txt v="micro" color={hues.accent.text}>{providerLabel}</Txt>
        </View>
      </Card>

      <Card gap={0} style={{ paddingTop: 6, paddingBottom: 6, paddingHorizontal: 12 }}>
        <Row icon={UserIcon} label="About you" meta={`${profile.age} · ${profile.weightLb} lb · ${profile.runDaysPerWeek} runs/wk`} hue={hues.violet} onPress={() => router.push('/(onboarding)/about-you')} />
        <View style={styles.hair} />
        <Row icon={Flag} label={hasRace ? race.name : 'Add a race'} meta={hasRace ? `${race.distance} · goal ${race.goalTime}` : 'Set a goal to build a plan'} hue={hues.accent} onPress={() => router.push('/(onboarding)/goal')} />
        <View style={styles.hair} />
        <Row icon={UtensilsCrossed} label="Diet & allergies" meta={profile.diet || 'None set'} hue={hues.green} onPress={() => router.push('/(onboarding)/about-you')} />
      </Card>

      <Card gap={0} style={{ paddingTop: 6, paddingBottom: 6, paddingHorizontal: 12 }}>
        <Row icon={RotateCcw} label="Reset this account" meta="Start onboarding over" hue={hues.amber} onPress={onReset} danger />
        <View style={styles.hair} />
        <Row icon={LogOut} label="Sign out" hue={hues.accent} onPress={onSignOut} danger />
      </Card>

      <Txt v="caption" style={{ textAlign: 'center', paddingHorizontal: 16 }}>
        Bubbie · fuel that follows the workout
      </Txt>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: -6, marginBottom: 4, alignSelf: 'flex-start' },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarFallback: { width: 60, height: 60, borderRadius: 30, backgroundColor: hues.accent.tint, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 6 },
  hair: { height: 1, backgroundColor: colors.hairline, marginHorizontal: 6 },
});
