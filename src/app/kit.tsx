import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { LetterView } from '@/components/LetterView';
import { BackBar, Button, Card, Screen, SectionLabel } from '@/components/ui';
import { buildClaimLetter, type ClaimDetails } from '@/claim/letters';
import { answersFor, effectiveFacts } from '@/lib/claim';
import { evaluate, formatMoney } from '@/rules';
import { useClaim } from '@/state/claim';
import { useClaims } from '@/state/claims';
import { flightKey, useEntitlements } from '@/state/entitlements';
import { C, R, S, T } from '@/theme';

function Field({
  label,
  value,
  onChange,
  placeholder,
  caps,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  caps?: 'characters' | 'words' | 'none';
  keyboard?: 'email-address';
}) {
  return (
    <View style={{ marginBottom: S.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        autoCapitalize={caps ?? 'words'}
        autoCorrect={false}
        keyboardType={keyboard}
        style={styles.input}
      />
    </View>
  );
}

export default function KitScreen() {
  const { facts, answers, experience } = useClaim();
  const { add } = useClaims();
  const ent = useEntitlements();
  const [name, setName] = useState('');
  const [others, setOthers] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [email, setEmail] = useState('');

  const effFacts = facts ? effectiveFacts(facts, experience) : undefined;
  const effAnswers = answersFor(experience, answers);
  const verdict = effFacts ? evaluate(effFacts, effAnswers) : undefined;

  if (!facts || !effFacts || !verdict) return <Redirect href="/" />;
  if (!ent.isUnlocked(flightKey(facts))) return <Redirect href="/paywall" />;

  const details: ClaimDetails = {
    passengerName: name,
    otherPassengers: others.split(',').map((s) => s.trim()).filter(Boolean),
    bookingRef: bookingRef.trim().toUpperCase(),
    email,
  };
  const letter = buildClaimLetter(verdict, effFacts, effAnswers, details);
  const n = 1 + details.otherPassengers.length;
  const total = verdict.estimate
    ? formatMoney({ amount: verdict.estimate.perPassenger.amount * n, currency: verdict.estimate.perPassenger.currency })
    : undefined;

  const save = () => {
    const saved = add({
      facts: effFacts,
      answers: effAnswers,
      experience,
      details,
      summary: { regime: verdict.regime, outcome: verdict.outcome, amountText: total },
    });
    router.replace({ pathname: '/claims', params: { highlight: saved.id } });
  };

  return (
    <Screen footer={<Button title="Save to my claims" icon="bookmark" onPress={save} disabled={!name.trim()} />}>
      <BackBar onBack={() => router.back()} title="Your Claim Kit" />
      {ent.demo ? <Text style={styles.demo}>Demo mode: no RevenueCat key configured, so the kit is unlocked.</Text> : null}
      <Text style={styles.title}>{total ? `Claim ${total}` : 'Request your refund'}</Text>
      <Text style={styles.sub}>
        Your letter cites the exact rules that apply. Send it through {verdict.claimAgainst.name}’s official claim form or
        customer relations email.
      </Text>

      <SectionLabel>Your details</SectionLabel>
      <Card>
        <Field label="Your full name" value={name} onChange={setName} placeholder="As on the booking" />
        <Field label="Other passengers (optional)" value={others} onChange={setOthers} placeholder="Comma-separated names" />
        <Field label="Booking reference" value={bookingRef} onChange={setBookingRef} placeholder="e.g. X7K2PQ" caps="characters" />
        <Field label="Email (optional)" value={email} onChange={setEmail} placeholder="For the airline's reply" caps="none" keyboard="email-address" />
      </Card>

      <SectionLabel>Claim letter</SectionLabel>
      <LetterView letter={letter} />

      <SectionLabel>Before you send</SectionLabel>
      {[
        'Attach your booking confirmation and boarding pass (photos are fine).',
        'Keep receipts for meals, hotels or taxis — those are claimed separately.',
        'Save the claim here so we remind you to follow up after 14 days.',
      ].map((t) => (
        <Text key={t} style={styles.bullet}>
          • {t}
        </Text>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...T.h1, color: C.accent },
  demo: { color: C.info, fontSize: 12, marginBottom: S.sm },
  sub: { ...T.body, color: C.muted, marginTop: S.xs },
  label: { ...T.label, color: C.muted, fontSize: 11, marginBottom: 6 },
  input: {
    backgroundColor: C.bg,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.line,
    color: C.text,
    fontSize: 16,
    paddingHorizontal: S.md,
    height: 48,
  },
  bullet: { ...T.small, color: C.text, marginBottom: S.sm },
});
