import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { BackBar, Button, Card, ChipGroup, Screen } from '@/components/ui';
import { addDays, todayIso, useClaims, type ClaimStatus, type SavedClaim } from '@/state/claims';
import { useClaim } from '@/state/claim';
import { C, S, T } from '@/theme';

const STATUS_OPTIONS: { value: ClaimStatus; label: string }[] = [
  { value: 'drafted', label: 'Drafted' },
  { value: 'sent', label: 'Sent' },
  { value: 'replied', label: 'Replied' },
  { value: 'paid', label: 'Paid' },
  { value: 'rejected', label: 'Rejected' },
];

function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function nextStep(c: SavedClaim): { text: string; due?: boolean } {
  const today = todayIso();
  switch (c.status) {
    case 'drafted':
      return { text: 'Send the letter, then mark it as sent.' };
    case 'sent': {
      const followUp = addDays(c.sentOn ?? today, 14);
      return followUp <= today
        ? { text: 'No reply after 14 days — send the follow-up.', due: true }
        : { text: `Follow up on ${longDate(followUp)} if there's no reply.` };
    }
    case 'replied':
      return { text: 'If they refused without a valid reason, escalate.' };
    case 'rejected':
      return { text: 'Escalate to the enforcement body.', due: true };
    case 'paid':
      return { text: 'Done. Enjoy your money.' };
  }
}

function ClaimCard({ claim, highlighted }: { claim: SavedClaim; highlighted: boolean }) {
  const { update, remove } = useClaims();
  const step = nextStep(claim);
  const f = claim.facts;

  return (
    <Card style={{ marginBottom: S.md, borderWidth: 1, borderColor: highlighted ? C.accent : 'transparent' }}>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <Text style={styles.flight}>
            {f.flightNumber} · {f.origin.iata} → {f.destination.iata}
          </Text>
          <Text style={styles.meta}>
            {f.operatingCarrier.name} · {longDate(f.date)}
          </Text>
        </View>
        <Text style={styles.amount}>{claim.summary.amountText ?? 'Refund'}</Text>
      </View>

      <View style={{ marginTop: S.md }}>
        <ChipGroup
          options={STATUS_OPTIONS}
          value={claim.status}
          onChange={(status) =>
            update(claim.id, { status, sentOn: status === 'sent' && !claim.sentOn ? todayIso() : claim.sentOn })
          }
        />
      </View>

      <View style={styles.next}>
        <Ionicons name={step.due ? 'alert-circle' : 'time-outline'} size={16} color={step.due ? C.accent : C.muted} />
        <Text style={[styles.nextText, step.due && { color: C.accent }]}>{step.text}</Text>
      </View>

      <View style={styles.links}>
        <Pressable onPress={() => router.push({ pathname: '/letter', params: { id: claim.id, kind: 'claim' } })}>
          <Text style={styles.link}>Claim letter</Text>
        </Pressable>
        {claim.status !== 'drafted' ? (
          <Pressable onPress={() => router.push({ pathname: '/letter', params: { id: claim.id, kind: 'followup' } })}>
            <Text style={styles.link}>Follow-up</Text>
          </Pressable>
        ) : null}
        {claim.status === 'replied' || claim.status === 'rejected' || step.due ? (
          <Pressable onPress={() => router.push({ pathname: '/letter', params: { id: claim.id, kind: 'escalation' } })}>
            <Text style={styles.link}>Escalate</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() =>
            Alert.alert('Delete this claim?', 'This only removes it from this phone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => remove(claim.id) },
            ])
          }
        >
          <Text style={[styles.link, { color: C.faint }]}>Delete</Text>
        </Pressable>
      </View>
    </Card>
  );
}

export default function ClaimsScreen() {
  const { claims } = useClaims();
  const { reset } = useClaim();
  const { highlight } = useLocalSearchParams<{ highlight?: string }>();

  return (
    <Screen
      footer={
        <Button
          title="Check another flight"
          variant="ghost"
          onPress={() => {
            reset();
            router.dismissAll();
          }}
        />
      }
    >
      <BackBar onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} title="My claims" />
      <Text style={styles.title}>My claims</Text>
      <Text style={styles.sub}>Stored only on this phone.</Text>
      <View style={{ marginTop: S.xl }}>
        {claims.length === 0 ? (
          <Text style={styles.sub}>No claims yet. Check a flight to start one.</Text>
        ) : (
          claims.map((c) => <ClaimCard key={c.id} claim={c} highlighted={c.id === highlight} />)
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...T.h1, color: C.text },
  sub: { ...T.body, color: C.muted, marginTop: S.xs },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  flight: { color: C.text, fontSize: 16, fontWeight: '800' },
  meta: { color: C.muted, fontSize: 13, marginTop: 2 },
  amount: { color: C.accent, fontSize: 22, fontWeight: '900' },
  next: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: S.md },
  nextText: { ...T.small, color: C.muted, flex: 1 },
  links: { flexDirection: 'row', gap: S.lg, marginTop: S.md },
  link: { color: C.info, fontWeight: '700', fontSize: 14 },
});
