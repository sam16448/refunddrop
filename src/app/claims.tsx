import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BackBar, Button, IconBadge, Screen } from '@/components/ui';
import { cancelReminder, FOLLOW_UP_DAYS, scheduleFollowUp } from '@/services/reminders';
import { useClaim } from '@/state/claim';
import { addDays, todayIso, useClaims, type ClaimStatus, type SavedClaim } from '@/state/claims';
import { C, F, R, S, T } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const STEPS: { value: ClaimStatus; label: string }[] = [
  { value: 'drafted', label: 'Drafted' },
  { value: 'sent', label: 'Sent' },
  { value: 'replied', label: 'Replied' },
  { value: 'paid', label: 'Paid' },
];

function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function nextStep(c: SavedClaim): { text: string; icon: IconName; due?: boolean } {
  const today = todayIso();
  switch (c.status) {
    case 'drafted':
      return { text: 'Send the letter, then tap Sent.', icon: 'paper-plane-outline' };
    case 'sent': {
      const followUp = addDays(c.sentOn ?? today, FOLLOW_UP_DAYS);
      return followUp <= today
        ? { text: 'No reply after 14 days — send the follow-up.', icon: 'alert-circle', due: true }
        : { text: `Reminder set for ${shortDate(followUp)} if there's no reply.`, icon: 'notifications-outline' };
    }
    case 'replied':
      return { text: 'Refused without a valid reason? Escalate it.', icon: 'chatbubble-ellipses-outline' };
    case 'rejected':
      return { text: 'Escalate to the enforcement body.', icon: 'alert-circle', due: true };
    case 'paid':
      return { text: 'Paid. Nice work — you kept all of it.', icon: 'checkmark-circle' };
  }
}

function Progress({ status, onChange }: { status: ClaimStatus; onChange: (s: ClaimStatus) => void }) {
  const idx = status === 'rejected' ? 2 : STEPS.findIndex((s) => s.value === status);
  return (
    <View style={styles.progress}>
      {STEPS.map((s, i) => {
        const done = i <= idx;
        const color = status === 'rejected' && i === 2 ? C.bad : done ? C.accent : C.line;
        return (
          <Pressable key={s.value} onPress={() => onChange(s.value)} style={styles.progressItem} accessibilityRole="button" accessibilityLabel={`Mark ${s.label}`}>
            <View style={[styles.progressBar, { backgroundColor: color }]} />
            <Text style={[styles.progressLabel, done && { color: C.text }]}>
              {status === 'rejected' && i === 2 ? 'Rejected' : s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ClaimCard({ claim, highlighted, index }: { claim: SavedClaim; highlighted: boolean; index: number }) {
  const { update, remove } = useClaims();
  const step = nextStep(claim);
  const f = claim.facts;

  const setStatus = async (status: ClaimStatus) => {
    if (status === claim.status) return;
    if (status === 'sent' && !claim.sentOn) {
      const sentOn = todayIso();
      update(claim.id, { status, sentOn });
      const reminderId = await scheduleFollowUp(claim, sentOn);
      if (reminderId) update(claim.id, { reminderId });
      return;
    }
    if (status === 'paid' || status === 'replied' || status === 'rejected') {
      await cancelReminder(claim.reminderId);
      update(claim.id, { status, reminderId: undefined });
      return;
    }
    update(claim.id, { status });
  };

  const markRejected = () => setStatus('rejected');

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(400)}
      style={[styles.card, highlighted && { borderColor: C.accent }]}
    >
      <View style={styles.head}>
        <View style={styles.routeChip}>
          <Text style={styles.routeText}>{f.origin.iata}</Text>
          <Ionicons name="arrow-forward" size={12} color={C.faint} />
          <Text style={styles.routeText}>{f.destination.iata}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.flight}>{f.flightNumber}</Text>
          <Text style={styles.meta}>
            {f.operatingCarrier.name} · {shortDate(f.date)}
          </Text>
        </View>
        <Text style={styles.amount}>{claim.summary.amountText ?? 'Refund'}</Text>
      </View>

      <Progress status={claim.status} onChange={setStatus} />

      <View style={[styles.next, step.due && { backgroundColor: C.accentSoft }]}>
        <Ionicons name={step.icon} size={16} color={step.due ? C.accent : C.muted} />
        <Text style={[styles.nextText, step.due && { color: C.accent }]}>{step.text}</Text>
      </View>

      <View style={styles.links}>
        <LinkButton icon="document-text-outline" label="Letter" onPress={() => router.push({ pathname: '/letter', params: { id: claim.id, kind: 'claim' } })} />
        {claim.status !== 'drafted' ? (
          <LinkButton icon="repeat-outline" label="Follow-up" onPress={() => router.push({ pathname: '/letter', params: { id: claim.id, kind: 'followup' } })} />
        ) : null}
        {claim.status === 'replied' || claim.status === 'rejected' || step.due ? (
          <LinkButton icon="megaphone-outline" label="Escalate" onPress={() => router.push({ pathname: '/letter', params: { id: claim.id, kind: 'escalation' } })} />
        ) : null}
        <View style={{ flex: 1 }} />
        <Pressable
          hitSlop={8}
          accessibilityLabel="More"
          onPress={() =>
            Alert.alert(`${f.flightNumber} claim`, undefined, [
              ...(claim.status !== 'rejected' && claim.status !== 'paid' ? [{ text: 'Mark as rejected', onPress: markRejected }] : []),
              {
                text: 'Delete claim',
                style: 'destructive' as const,
                onPress: () => {
                  cancelReminder(claim.reminderId);
                  remove(claim.id);
                },
              },
              { text: 'Cancel', style: 'cancel' as const },
            ])
          }
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={C.muted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function LinkButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.linkButton, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      <Ionicons name={icon} size={15} color={C.info} />
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

export default function ClaimsScreen() {
  const { claims } = useClaims();
  const { reset } = useClaim();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const paid = claims.filter((c) => c.status === 'paid').length;

  return (
    <Screen
      footer={
        <Button
          title="Check another flight"
          variant="subtle"
          icon="add"
          onPress={() => {
            reset();
            router.dismissAll();
          }}
        />
      }
    >
      <BackBar onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} title="My claims" />
      <Text style={styles.title}>My claims</Text>
      <Text style={styles.sub}>
        {claims.length} claim{claims.length === 1 ? '' : 's'}
        {paid ? ` · ${paid} paid` : ''} · stored only on this phone
      </Text>
      <View style={{ marginTop: S.xl }}>
        {claims.length === 0 ? (
          <View style={styles.empty}>
            <IconBadge name="folder-open-outline" size={24} color={C.muted} bg={C.surfaceHi} />
            <Text style={styles.emptyText}>No claims yet. Check a flight to start one.</Text>
          </View>
        ) : (
          claims.map((c, i) => <ClaimCard key={c.id} claim={c} highlighted={c.id === highlight} index={i} />)
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...T.h1, color: C.text },
  sub: { ...T.body, color: C.muted, marginTop: S.xs },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, marginBottom: S.md, borderWidth: 1, borderColor: C.line },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  routeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  routeText: { fontFamily: F.display, color: C.text, fontSize: 13 },
  flight: { color: C.text, fontSize: 16, fontFamily: F.bold },
  meta: { ...T.small, color: C.muted, marginTop: 1 },
  amount: { color: C.accent, fontSize: 22, fontFamily: F.display },
  progress: { flexDirection: 'row', gap: 6, marginTop: S.lg },
  progressItem: { flex: 1 },
  progressBar: { height: 5, borderRadius: 3 },
  progressLabel: { ...T.label, fontSize: 9.5, color: C.faint, marginTop: 6 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: S.md, backgroundColor: C.bg, padding: S.md, borderRadius: R.sm },
  nextText: { ...T.small, color: C.muted, flex: 1 },
  links: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.md },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: C.infoSoft },
  link: { color: C.info, fontFamily: F.bold, fontSize: 13 },
  empty: { alignItems: 'center', gap: S.md, padding: S.xxl, backgroundColor: C.surface, borderRadius: R.lg },
  emptyText: { ...T.body, color: C.muted, textAlign: 'center' },
});
