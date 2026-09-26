import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, IconBadge, PageHeader, Screen, SectionLabel } from '@/components/ui';
import { claimValue, walletTotals } from '@/lib/money';
import { formatMoney } from '@/rules';
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

function daysUntil(iso: string): number {
  return Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${todayIso()}T12:00:00Z`)) / 86_400_000);
}

function nextStep(c: SavedClaim): { text: string; icon: IconName; due?: boolean } {
  const today = todayIso();
  switch (c.status) {
    case 'drafted':
      return { text: 'Send the letter to the airline, then tap Sent.', icon: 'paper-plane-outline' };
    case 'sent': {
      const followUp = addDays(c.sentOn ?? today, FOLLOW_UP_DAYS);
      const days = daysUntil(followUp);
      return days <= 0
        ? { text: 'No reply after 14 days — send the follow-up now.', icon: 'alert-circle', due: true }
        : { text: `Follow-up reminder in ${days} day${days === 1 ? '' : 's'} (${shortDate(followUp)})`, icon: 'notifications-outline' };
    }
    case 'replied':
      return { text: 'Refused without a valid reason? Escalate it.', icon: 'chatbubble-ellipses-outline' };
    case 'rejected':
      return { text: 'Rejected — escalate to the enforcement body.', icon: 'alert-circle', due: true };
    case 'paid':
      return { text: 'Paid. You kept all of it.', icon: 'sparkles' };
  }
}

/** Order: needs action first, then in progress, then paid. */
function rank(c: SavedClaim): number {
  const s = nextStep(c);
  if (s.due) return 0;
  if (c.status === 'paid') return 2;
  return 1;
}

function Stepper({ status, onChange }: { status: ClaimStatus; onChange: (s: ClaimStatus) => void }) {
  const idx = status === 'rejected' ? 2 : STEPS.findIndex((s) => s.value === status);
  const tone = status === 'paid' ? C.good : status === 'rejected' ? C.bad : C.accent;
  return (
    <View style={styles.stepper}>
      {STEPS.map((s, i) => {
        const done = i < idx || status === 'paid';
        const current = i === idx && status !== 'paid';
        const color = done || current ? tone : C.line;
        const label = status === 'rejected' && i === 2 ? 'Rejected' : s.label;
        return (
          <Pressable key={s.value} onPress={() => onChange(s.value)} style={styles.stepItem} accessibilityRole="button" accessibilityLabel={`Mark ${s.label}`}>
            <View style={styles.stepTrack}>
              <View style={[styles.stepLine, { backgroundColor: i === 0 ? 'transparent' : i <= idx ? tone : C.line }]} />
              <View style={[styles.stepDot, { borderColor: color, backgroundColor: done ? tone : current ? C.bg : C.surface }]}>
                {done ? <Ionicons name="checkmark" size={13} color={C.accentInk} /> : current ? <View style={[styles.stepCore, { backgroundColor: tone }]} /> : null}
              </View>
              <View style={[styles.stepLine, { backgroundColor: i === STEPS.length - 1 ? 'transparent' : i < idx ? tone : C.line }]} />
            </View>
            <Text style={[styles.stepLabel, (done || current) && { color: current ? tone : C.text }]}>{label}</Text>
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
  const value = claimValue(claim);
  const paid = claim.status === 'paid';

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

  const letter = (kind: 'claim' | 'followup' | 'escalation') => router.push({ pathname: '/letter', params: { id: claim.id, kind } });

  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(400)} style={[styles.card, highlighted && { borderColor: C.accent }, paid && { borderColor: 'rgba(52,211,153,0.35)' }]}>
      <View style={styles.head}>
        <IconBadge name={paid ? 'checkmark-done' : 'airplane'} size={18} color={paid ? C.good : C.accent} bg={paid ? C.goodSoft : C.accentSoft} />
        <View style={{ flex: 1 }}>
          <Text style={styles.flight} numberOfLines={1}>
            {f.operatingCarrier.name} {f.flightNumber}
          </Text>
          <Text style={styles.meta}>
            {shortDate(f.date)} · {f.origin.iata} → {f.destination.iata}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.amount, paid && { color: C.good }]}>{value ? formatMoney(value) : 'Refund'}</Text>
          <Text style={[styles.regime, paid && { color: C.good }]}>{paid ? 'PAID' : claim.summary.regime.replace('_', ' ')}</Text>
        </View>
      </View>

      <Stepper status={claim.status} onChange={setStatus} />

      <Pressable
        disabled={!step.due}
        onPress={() => letter(claim.status === 'sent' ? 'followup' : 'escalation')}
        style={[styles.next, step.due && { backgroundColor: C.accentSoft }, paid && { backgroundColor: C.goodSoft }]}
      >
        <Ionicons name={step.icon} size={16} color={step.due ? C.accent : paid ? C.good : C.info} />
        <Text style={[styles.nextText, step.due && { color: C.accent, fontFamily: F.semibold }, paid && { color: C.good }]}>{step.text}</Text>
        {step.due ? <Ionicons name="chevron-forward" size={16} color={C.accent} /> : null}
      </Pressable>

      <View style={styles.links}>
        <LinkButton icon="document-text-outline" label="Letter" onPress={() => letter('claim')} />
        {claim.status !== 'drafted' && !paid ? <LinkButton icon="repeat-outline" label="Follow-up" onPress={() => letter('followup')} /> : null}
        {claim.status === 'replied' || claim.status === 'rejected' || step.due ? (
          <LinkButton icon="megaphone-outline" label="Escalate" onPress={() => letter('escalation')} />
        ) : null}
        <View style={{ flex: 1 }} />
        <Pressable
          hitSlop={10}
          accessibilityLabel="More actions"
          style={styles.more}
          onPress={() =>
            Alert.alert(`${f.flightNumber} claim`, undefined, [
              ...(claim.status === 'drafted' ? [{ text: 'Mark as sent (starts 14-day reminder)', onPress: () => setStatus('sent') }] : []),
              ...(!paid && claim.status !== 'rejected' ? [{ text: 'Mark as rejected', onPress: () => setStatus('rejected') }] : []),
              ...(!paid ? [{ text: 'Mark as paid', onPress: () => setStatus('paid') }] : []),
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
          <Ionicons name="ellipsis-horizontal" size={18} color={C.muted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function LinkButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.linkButton, pressed && { opacity: 0.7 }]} accessibilityRole="button">
      <Ionicons name={icon} size={15} color={C.text} />
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}

export default function ClaimsScreen() {
  const { claims, loaded } = useClaims();
  const { reset } = useClaim();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();
  const wallet = walletTotals(claims);
  const sorted = [...claims].sort((a, b) => rank(a) - rank(b));
  const due = claims.filter((c) => nextStep(c).due).length;

  const startNew = () => {
    reset();
    router.navigate('/');
  };

  return (
    <Screen tab>
      <PageHeader
        title="My claims"
        sub={claims.length ? `${claims.length} tracked · stored only on this phone` : 'Track every claim until it’s paid'}
        right={
          <Pressable onPress={() => router.push('/scan')} style={styles.addButton} accessibilityLabel="New claim" hitSlop={8}>
            <Ionicons name="add" size={24} color={C.accentInk} />
          </Pressable>
        }
      />

      {!loaded ? null : claims.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.empty}>
          <IconBadge name="wallet-outline" size={30} color={C.accent} bg={C.accentSoft} />
          <Text style={styles.emptyTitle}>No claims yet</Text>
          <Text style={styles.emptyText}>
            Check a delayed or cancelled flight. If you’re owed money, your claim lands here with reminders until it’s paid.
          </Text>
          <View style={{ alignSelf: 'stretch', gap: S.sm, marginTop: S.md }}>
            <Button title="Scan boarding pass" icon="scan" onPress={() => router.push('/scan')} />
            <Button title="Enter flight number" variant="ghost" icon="create-outline" onPress={startNew} />
          </View>
        </Animated.View>
      ) : (
        <>
          <Animated.View entering={FadeInDown.duration(400)}>
            <LinearGradient colors={['#2A2210', '#121A2B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wallet}>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.walletLabel}>BEING CLAIMED</Text>
                  <Text style={[styles.walletValue, { color: C.accent }]} numberOfLines={1} adjustsFontSizeToFit>
                    {wallet.open}
                  </Text>
                </View>
                <View style={styles.walletDivider} />
                <View style={{ flex: 1, paddingLeft: S.lg }}>
                  <Text style={styles.walletLabel}>RECEIVED</Text>
                  <Text style={[styles.walletValue, { color: C.good }]} numberOfLines={1} adjustsFontSizeToFit>
                    {wallet.received}
                  </Text>
                </View>
              </View>
              <View style={styles.walletFoot}>
                <Ionicons name={due ? 'alert-circle' : 'shield-checkmark-outline'} size={15} color={due ? C.accent : C.muted} />
                <Text style={[styles.walletFootText, due ? { color: C.accent } : null]}>
                  {due ? `${due} claim${due > 1 ? 's need' : ' needs'} your action` : 'Nothing due — we’ll remind you when a follow-up is needed'}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>

          <SectionLabel>Your claims</SectionLabel>
          {sorted.map((c, i) => (
            <ClaimCard key={c.id} claim={c} highlighted={c.id === highlight} index={i} />
          ))}
          <Text style={styles.tip}>Tap a step to update a claim. Marking one Sent sets a 14-day follow-up reminder.</Text>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  wallet: { borderRadius: R.xl, padding: S.xl, borderWidth: 1, borderColor: 'rgba(255,176,32,0.3)' },
  walletLabel: { ...T.label, color: C.muted, fontSize: 10 },
  walletValue: { fontFamily: F.display, fontSize: 32, marginTop: 4 },
  walletDivider: { width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.15)' },
  walletFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: S.lg, paddingTop: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  walletFootText: { ...T.small, color: C.muted, flex: 1 },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, marginBottom: S.md, borderWidth: 1, borderColor: C.line },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  flight: { color: C.text, fontSize: 16, fontFamily: F.bold },
  meta: { ...T.small, color: C.muted, marginTop: 1 },
  amount: { color: C.accent, fontSize: 22, fontFamily: F.display },
  regime: { ...T.label, fontSize: 9.5, color: C.faint, marginTop: 1 },
  stepper: { flexDirection: 'row', marginTop: S.lg },
  stepItem: { flex: 1, alignItems: 'center' },
  stepTrack: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  stepLine: { flex: 1, height: 2 },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepCore: { width: 10, height: 10, borderRadius: 5 },
  stepLabel: { fontFamily: F.semibold, fontSize: 11.5, color: C.faint, marginTop: 6 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: S.lg, backgroundColor: C.infoSoft, padding: S.md, borderRadius: R.sm },
  nextText: { ...T.small, color: C.info, flex: 1 },
  links: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.md },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: C.surfaceHi },
  link: { color: C.text, fontFamily: F.semibold, fontSize: 13 },
  more: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: S.sm, padding: S.xl, backgroundColor: C.surface, borderRadius: R.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, marginTop: S.md },
  emptyTitle: { color: C.text, fontFamily: F.display, fontSize: 22, marginTop: S.sm },
  emptyText: { ...T.body, color: C.muted, textAlign: 'center' },
  tip: { ...T.small, color: C.faint, textAlign: 'center', marginTop: S.sm, fontSize: 12 },
});
