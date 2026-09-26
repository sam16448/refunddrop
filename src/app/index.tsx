import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Screen, SectionLabel } from '@/components/ui';
import { SAMPLE_FLIGHTS, type SampleFlight } from '@/data/sampleFlights';
import { isValidDate, isValidFlightNumber, yesterdayIso } from '@/lib/format';
import { lookupFlight } from '@/services/flightLookup';
import { useClaim } from '@/state/claim';
import { C, R, S, T } from '@/theme';

export default function LookupScreen() {
  const { setFlight } = useClaim();
  const [number, setNumber] = useState('');
  const [date, setDate] = useState(yesterdayIso());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const openSample = (s: SampleFlight) => {
    setFlight(s.facts, 'sample');
    router.push('/flight');
  };

  const check = async () => {
    setError(undefined);
    if (!isValidFlightNumber(number)) return setError('Enter a flight number like LH 756 or BA117.');
    if (!isValidDate(date)) return setError('Enter the date as YYYY-MM-DD.');
    setLoading(true);
    const result = await lookupFlight(number, date);
    setLoading(false);
    if (result.kind === 'error') return setError(result.message);
    if (result.kind === 'sample') return openSample(result.sample);
    setFlight(result.flights[0], 'live');
    router.push('/flight');
  };

  return (
    <Screen>
      <View style={styles.brandRow}>
        <View style={styles.logo}>
          <Ionicons name="airplane" size={18} color={C.accentInk} />
        </View>
        <Text style={styles.brand}>RefundDrop</Text>
      </View>

      <Text style={styles.hero}>Delayed or cancelled?</Text>
      <Text style={styles.sub}>See what the airline owes you under EU, UK and US rules — and claim it yourself, keeping 100%.</Text>

      <Card style={{ marginTop: S.xl }}>
        <Text style={styles.inputLabel}>Flight number</Text>
        <TextInput
          value={number}
          onChangeText={setNumber}
          placeholder="e.g. LH 756"
          placeholderTextColor={C.faint}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
          returnKeyType="next"
        />
        <Text style={[styles.inputLabel, { marginTop: S.lg }]}>Date of departure</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={C.faint}
          keyboardType="numbers-and-punctuation"
          style={styles.input}
          returnKeyType="search"
          onSubmitEditing={check}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ marginTop: S.lg }}>
          <Button title="Check my flight" icon="search" onPress={check} loading={loading} />
        </View>
      </Card>

      <SectionLabel>Or try a sample flight</SectionLabel>
      {SAMPLE_FLIGHTS.map((s) => (
        <Pressable key={s.id} onPress={() => openSample(s)} style={({ pressed }) => [styles.sample, pressed && { opacity: 0.7 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sampleTitle}>
              {s.facts.flightNumber} · {s.title}
            </Text>
            <Text style={styles.sampleSub}>{s.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.muted} />
        </Pressable>
      ))}
      <Text style={styles.footnote}>Sample flights use real routes with illustrative disruptions.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: S.xxl },
  logo: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginRight: S.sm },
  brand: { color: C.text, fontSize: 18, fontWeight: '800' },
  hero: { ...T.h1, color: C.text, fontSize: 34, lineHeight: 40 },
  sub: { ...T.body, color: C.muted, marginTop: S.sm },
  inputLabel: { ...T.label, color: C.muted, marginBottom: S.sm },
  input: {
    backgroundColor: C.bg,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    color: C.text,
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: S.lg,
    height: 54,
    letterSpacing: 1,
  },
  error: { color: C.bad, marginTop: S.md, ...T.small },
  sample: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.lg,
    marginBottom: S.sm,
  },
  sampleTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  sampleSub: { color: C.muted, fontSize: 13, marginTop: 2 },
  footnote: { color: C.faint, fontSize: 12, marginTop: S.sm },
});
