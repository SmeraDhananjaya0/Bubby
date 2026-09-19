import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ArrowRight, Check, Sparkles } from 'lucide-react-native';
import { Button, Card, Chip, Header, IconCircle, Screen, Txt } from '@/components';
import { useAppStore } from '@/store/useAppStore';
import { todayLabel } from '@/lib/format';
import { colors, fonts, hues } from '@/theme/tokens';
import type { ChatMessage, CoachProposal } from '@/types';

function ProposalCard({ message, proposal }: { message: ChatMessage; proposal: CoachProposal }) {
  const applyProposal = useAppStore((s) => s.applyProposal);
  const dismissProposal = useAppStore((s) => s.dismissProposal);
  const status = message.proposalStatus;

  return (
    <>
      <Card gap={0} style={{ paddingTop: 6, paddingBottom: 6, paddingHorizontal: 16, borderRadius: 20 }}>
        {proposal.changes.map((c, i) => (
          <View key={i} style={[styles.change, i > 0 && { borderTopWidth: 1, borderTopColor: colors.hairline }]}>
            <Txt style={{ width: 34, fontFamily: fonts.bold, fontSize: 12, color: colors.caption }}>{c.day}</Txt>
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
              <Txt style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.caption, textDecorationLine: 'line-through' }}>{c.from}</Txt>
              <ArrowRight size={12} color={colors.caption} strokeWidth={2.6} />
              <Txt style={{ fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink }}>{c.to}</Txt>
            </View>
          </View>
        ))}
      </Card>
      {status === 'applied' ? (
        <Chip label="Applied" hue={hues.teal} size="md" icon={<Check size={13} color={hues.teal.text} strokeWidth={2.8} />} style={{ alignSelf: 'flex-start', height: 30 }} />
      ) : status === 'dismissed' ? (
        <Chip label="Kept your plan" size="md" style={{ alignSelf: 'flex-start', height: 30 }} />
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button label="Update my plan" onPress={() => applyProposal(message.id, proposal)} style={{ paddingHorizontal: 18 }} />
          <Button variant="secondary" label="Keep plan" onPress={() => dismissProposal(message.id)} />
        </View>
      )}
      {proposal.caution ? (
        <Txt v="small" style={{ color: colors.caption, fontFamily: fonts.medium }}>{proposal.caution}</Txt>
      ) : null}
    </>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  if (message.role === 'you') {
    return (
      <View style={{ alignItems: 'flex-end' }}>
        <View style={styles.youBubble}>
          <Txt v="body" color={colors.white}>{message.text}</Txt>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.coachRow}>
      <IconCircle icon={Sparkles} hue={hues.violet} size={28} iconSize={14} />
      <View style={{ flex: 1, gap: 12 }}>
        <Txt v="body" style={{ paddingTop: 3 }}>{message.text}</Txt>
        {message.proposal ? <ProposalCard message={message} proposal={message.proposal} /> : null}
      </View>
    </View>
  );
}

/** Coach tab: a live chat that adjusts the plan when you approve a proposal. */
export default function Coach() {
  const chat = useAppStore((s) => s.chat);
  const send = useAppStore((s) => s.sendCoachMessage);
  const busy = useAppStore((s) => s.coachBusy);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const onSend = () => {
    const text = draft.trim();
    if (!text || busy) return;
    send(text);
    setDraft('');
  };

  return (
    <Screen
      ambient="coach"
      bottomPad={176}
      contentStyle={{ gap: 18 }}
      scrollRef={scrollRef}
      onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      footer={
        <View style={styles.composerWrap}>
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Tell your coach anything"
              placeholderTextColor={colors.caption}
              style={styles.input}
              accessibilityLabel="Message your coach"
              multiline
              onSubmitEditing={onSend}
              returnKeyType="send"
              blurOnSubmit
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            onPress={onSend}
            disabled={!draft.trim() || busy}
            style={[styles.send, (!draft.trim() || busy) && { opacity: 0.4 }]}
          >
            {busy ? <ActivityIndicator color={colors.white} /> : <ArrowRight size={20} color={colors.white} strokeWidth={2.6} />}
          </Pressable>
        </View>
      }
    >
      <Header eyebrow={todayLabel()} title="Coach" />
      {chat.map((m) => (
        <Bubble key={m.id} message={m} />
      ))}
      {busy ? (
        <View style={styles.coachRow}>
          <IconCircle icon={Sparkles} hue={hues.violet} size={28} iconSize={14} />
          <Txt v="bodyMuted" style={{ paddingTop: 3 }}>Thinking…</Txt>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  coachRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  youBubble: { maxWidth: 300, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, borderBottomRightRadius: 6, backgroundColor: colors.ink },
  change: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  composerWrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, width: '100%', marginBottom: 76 },
  composer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 52,
    maxHeight: 120,
    paddingLeft: 18,
    paddingRight: 16,
    paddingVertical: 8,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    boxShadow: '0 1px 2px rgba(27, 26, 25, 0.06), 0 10px 30px rgba(27, 26, 25, 0.08)',
  },
  input: { flex: 1, fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, padding: 0, maxHeight: 104 },
  send: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(27, 26, 25, 0.16)' },
});
