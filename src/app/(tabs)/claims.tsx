import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, IconBadge, PageHeader, Screen, SectionLabel, Tag } from '@/components/ui';
import { agencySavings, claimValue, walletTotals } from '@/lib/money';
import { formatMoney } from '@/rules';
import { cancelReminder, FOLLOW_UP_DAYS, scheduleFollowUp } from '@/services/reminders';
import { useClaim } from '@/state/claim';
import { addDays, todayIso, useClaims, type ClaimStatus, type SavedClaim } from '@/state/claims';
import { C, F, R, S, SHADOW, T } from '@/theme';

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
  const tone = status === 'paid' ? C.good : status === 'rejected' ? C.bad : C.blue;
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
    <Animated.View entering={FadeInDown.delay(index * 70).duration(400)} style={[styles.card, highlighted && { borderColor: C.blue }, paid && { borderColor: 'rgba(16,185,129,0.4)' }]}>
      <View style={styles.head}>
        <IconBadge name={paid ? 'checkmark-done' : 'airplane'} size={18} color={paid ? C.good : C.blue} bg={paid ? C.goodSoft : C.accentSoft} />
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
        style={[styles.next, step.due && { backgroundColor: C.goldSoft }, paid && { backgroundColor: C.goodSoft }]}
      >
        <Ionicons name={step.icon} size={16} color={step.due ? C.text : paid ? C.good : C.info} />
        <Text style={[styles.nextText, step.due && { color: C.text, fontFamily: F.bold }, paid && { color: C.good }]}>{step.text}</Text>
        {step.due ? <Ionicons name="chevron-forward" size={16} color={C.text} /> : null}
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
      <Ionicons name={icon} size={15} color={C.blue} />
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
    <Screen
      tab
      overlap={claims.length ? 56 : 28}
      header={
        <PageHeader
          title="My claims"
          sub={claims.length ? `${claims.length} tracked · stored only on this phone` : 'Track every claim until it’s paid'}
          right={
            <Pressable onPress={() => router.push('/scan')} style={styles.addButton} accessibilityLabel="New claim" hitSlop={8}>
              <Ionicons name="add" size={26} color={C.text} />
            </Pressable>
          }
        />
      }
    >

      {!loaded ? null : claims.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.empty}>
          <IconBadge name="folder-open-outline" size={30} />
          <Text style={styles.emptyTitle}>No claims yet</Text>
          <Text style={styles.emptyText}>
            Check a delayed or cancelled flight. If you’re owed money, your claim lands here with reminders until it’s paid.
          </Text>
          <View style={{ alignSelf: 'stretch', gap: S.sm, marginTop: S.md }}>
            <Button title="Scan boarding pass" variant="gold" icon="qr-code" onPress={() => router.push('/scan')} />
            <Button title="Enter flight number" variant="ghost" icon="create-outline" onPress={startNew} />
          </View>
        </Animated.View>
      ) : (
        <>
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.wallet}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.lg }}>
                <View style={styles.liveDot} />
                <Text style={[T.label, { color: C.text, flex: 1, fontSize: 10.5 }]}>Your flight money</Text>
                <Tag text="0% fee" tone="blue" />
              </View>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.walletLabel}>Being claimed</Text>
                  <Text style={[styles.walletValue, { color: C.blue }]} numberOfLines={1} adjustsFontSizeToFit>
                    {wallet.open}
                  </Text>
                </View>
                <View style={styles.walletDivider} />
                <View style={{ flex: 1, paddingLeft: S.lg }}>
                  <Text style={styles.walletLabel}>Received</Text>
                  <Text style={[styles.walletValue, { color: C.good }]} numberOfLines={1} adjustsFontSizeToFit>
                    {wallet.received}
                  </Text>
                </View>
              </View>
              <View style={styles.savings}>
                <View style={styles.coin}>
                  <Ionicons name="wallet" size={14} color={C.text} />
                </View>
                <Text style={styles.savingsText}>{agencySavings(claims)} kept from claim companies</Text>
              </View>
              <View style={[styles.walletFoot, due ? { backgroundColor: C.goldSoft } : null]}>
                <Ionicons name={due ? 'alert-circle' : 'notifications-outline'} size={16} color={due ? C.text : C.muted} />
                <Text style={[styles.walletFootText, due ? { color: C.text, fontFamily: F.bold } : null]}>
                  {due ? `${due} claim${due > 1 ? 's need' : ' needs'} your action` : 'Nothing due — we’ll remind you when a follow-up is needed'}
                </Text>
              </View>
            </View>
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
  addButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  wallet: { backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl, ...SHADOW },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.blue },
  walletLabel: { color: C.text, fontFamily: F.bold, fontSize: 13 },
  walletValue: { fontFamily: F.display, fontSize: 32, marginTop: 2, letterSpacing: -1 },
  walletDivider: { width: 1, backgroundColor: C.line },
  savings: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.bg, borderRadius: R.md, padding: S.md, marginTop: S.lg },
  coin: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  savingsText: { flex: 1, color: C.text, fontFamily: F.bold, fontSize: 13 },
  walletFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: S.sm, padding: S.md, borderRadius: R.md },
  walletFootText: { ...T.small, color: C.muted, flex: 1 },
  card: { backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl, marginBottom: S.md, borderWidth: 2, borderColor: 'transparent', ...SHADOW },
  head: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  flight: { color: C.text, fontSize: 16, fontFamily: F.black, letterSpacing: -0.2 },
  meta: { ...T.small, color: C.muted, marginTop: 1 },
  amount: { color: C.blue, fontSize: 22, fontFamily: F.display, letterSpacing: -0.6 },
  regime: { ...T.label, fontSize: 9.5, color: C.faint, marginTop: 1 },
  stepper: { flexDirection: 'row', marginTop: S.lg },
  stepItem: { flex: 1, alignItems: 'center' },
  stepTrack: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  stepLine: { flex: 1, height: 2 },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepCore: { width: 10, height: 10, borderRadius: 5 },
  stepLabel: { fontFamily: F.bold, fontSize: 11.5, color: C.faint, marginTop: 6 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: S.lg, backgroundColor: C.infoSoft, padding: S.md, borderRadius: R.md },
  nextText: { ...T.small, color: C.info, flex: 1 },
  links: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.md },
  linkButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: C.accentSoft },
  link: { color: C.blue, fontFamily: F.bold, fontSize: 13 },
  more: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.surfaceHi, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: S.sm, padding: S.xl, backgroundColor: C.surface, borderRadius: R.xl, ...SHADOW },
  emptyTitle: { color: C.text, fontFamily: F.display, fontSize: 22, marginTop: S.sm, letterSpacing: -0.5 },
  emptyText: { ...T.body, color: C.muted, textAlign: 'center' },
  tip: { ...T.small, color: C.faint, textAlign: 'center', marginTop: S.sm, fontSize: 12 },
});
