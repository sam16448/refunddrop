import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { DateField } from '@/components/DateField';
import { Button, Card, IconBadge, Screen, SectionLabel } from '@/components/ui';
import { SAMPLE_FLIGHTS, type SampleFlight } from '@/data/sampleFlights';
import { isValidDate, isValidFlightNumber, localTime } from '@/lib/format';
import { INTRO_SEEN_KEY } from '@/lib/storageKeys';
import type { FlightFacts } from '@/rules';
import { liveLookupEnabled, lookupFlight } from '@/services/flightLookup';
import { useClaim } from '@/state/claim';
import { useClaims } from '@/state/claims';
import { C, F, R, S, T } from '@/theme';

function yesterdayLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function LookupScreen() {
  const { setFlight, setPassenger } = useClaim();
  const { claims } = useClaims();
  const [number, setNumber] = useState('');
  const [date, setDate] = useState(yesterdayLocal());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [legs, setLegs] = useState<FlightFacts[]>();

  useEffect(() => {
    AsyncStorage.getItem(INTRO_SEEN_KEY)
      .then((seen) => {
        if (!seen) router.replace('/intro');
      })
      .catch(() => {});
  }, []);

  const open = (facts: FlightFacts, source: 'sample' | 'live') => {
    setPassenger(undefined);
    setFlight(facts, source);
    setLegs(undefined);
    router.push('/flight');
  };

  const openSample = (s: SampleFlight) => open(s.facts, 'sample');

  const check = async () => {
    setError(undefined);
    setLegs(undefined);
    if (!isValidFlightNumber(number)) return setError('Enter a flight number like LH 756 or BA117.');
    if (!isValidDate(date)) return setError('Pick the date your flight was due to leave.');
    setLoading(true);
    const result = await lookupFlight(number, date);
    setLoading(false);
    if (result.kind === 'error') return setError(result.message);
    if (result.kind === 'sample') return openSample(result.sample);
    if (result.flights.length === 1) return open(result.flights[0], 'live');
    setLegs(result.flights);
  };

  return (
    <Screen>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Ionicons name="airplane" size={16} color={C.accentInk} />
          </View>
          <Text style={styles.brand}>RefundDrop</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: S.sm }}>
          {claims.length ? (
            <Pressable onPress={() => router.push('/claims')} style={styles.topButton} hitSlop={8} accessibilityLabel="My claims">
              <Ionicons name="folder-open-outline" size={16} color={C.text} />
              <Text style={styles.topButtonText}>{claims.length}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.push('/about')} style={styles.topButton} hitSlop={8} accessibilityLabel="About">
            <Ionicons name="information-circle-outline" size={18} color={C.text} />
          </Pressable>
        </View>
      </View>

      <Animated.View entering={FadeInDown.duration(500)}>
        <Text style={styles.hero}>
          Delayed or cancelled?{'\n'}
          <Text style={{ color: C.accent }}>Get what you’re owed.</Text>
        </Text>
        <Text style={styles.sub}>Up to €600 under EU and UK rules. Check free, claim it yourself, keep 100%.</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(500)} style={{ marginTop: S.xl }}>
        <Pressable onPress={() => router.push('/scan')} style={({ pressed }) => [styles.scanCard, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel="Scan boarding pass">
          <IconBadge name="scan" size={24} color={C.accentInk} bg={C.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.scanTitle}>Scan boarding pass</Text>
            <Text style={styles.scanSub}>Paper or mobile — fills in everything</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.accent} />
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(180).duration(500)}>
        <SectionLabel>Or enter your flight</SectionLabel>
        <Card>
          <Text style={styles.inputLabel}>Flight number</Text>
          <TextInput
            value={number}
            onChangeText={setNumber}
            placeholder="e.g. LH 756"
            placeholderTextColor={C.faint}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
            returnKeyType="done"
          />
          <Text style={[styles.inputLabel, { marginTop: S.lg }]}>Departure date</Text>
          <DateField value={date} onChange={setDate} />
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={C.bad} />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}
          <View style={{ marginTop: S.lg }}>
            <Button title="Check my flight" icon="search" variant="subtle" onPress={check} loading={loading} />
          </View>
          {!liveLookupEnabled ? <Text style={styles.note}>Live lookup is off in this build — sample flights work offline.</Text> : null}
        </Card>

        {legs ? (
          <>
            <SectionLabel>Which flight were you on?</SectionLabel>
            {legs.map((f, i) => (
              <Pressable key={i} onPress={() => open(f, 'live')} style={({ pressed }) => [styles.sample, pressed && { opacity: 0.7 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sampleTitle}>
                    {f.origin.iata} → {f.destination.iata}
                  </Text>
                  <Text style={styles.sampleSub}>
                    Departs {localTime(f.scheduledDepartureUtc, f.origin.tz)} · {f.origin.city} to {f.destination.city}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </Pressable>
            ))}
          </>
        ) : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(260).duration(500)}>
        <SectionLabel>Try a sample flight</SectionLabel>
        {SAMPLE_FLIGHTS.map((s) => (
          <Pressable key={s.id} onPress={() => openSample(s)} style={({ pressed }) => [styles.sample, pressed && { opacity: 0.7 }]}>
            <View style={styles.sampleCode}>
              <Text style={styles.sampleCodeText}>{s.facts.origin.iata}</Text>
              <Ionicons name="arrow-forward" size={12} color={C.faint} />
              <Text style={styles.sampleCodeText}>{s.facts.destination.iata}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sampleTitle}>{s.facts.flightNumber}</Text>
              <Text style={styles.sampleSub}>{s.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.muted} />
          </Pressable>
        ))}
        <Text style={styles.footnote}>Sample flights use real routes with illustrative disruptions.</Text>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.xxl },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginRight: S.sm },
  brand: { color: C.text, fontSize: 18, fontFamily: F.display },
  topButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    minWidth: 36,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  topButtonText: { color: C.text, fontFamily: F.bold, fontSize: 13 },
  hero: { fontFamily: F.display, color: C.text, fontSize: 36, lineHeight: 42, letterSpacing: -0.8 },
  sub: { ...T.body, color: C.muted, marginTop: S.md, fontSize: 16 },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.lg,
    padding: S.lg,
    borderRadius: R.lg,
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: 'rgba(255,176,32,0.35)',
  },
  scanTitle: { color: C.text, fontFamily: F.bold, fontSize: 17 },
  scanSub: { ...T.small, color: C.muted, marginTop: 2 },
  inputLabel: { ...T.label, color: C.muted, marginBottom: S.sm },
  input: {
    backgroundColor: C.bg,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.line,
    color: C.text,
    fontSize: 22,
    fontFamily: F.display,
    paddingHorizontal: S.lg,
    height: 56,
    letterSpacing: 1.5,
  },
  errorBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: S.md, backgroundColor: C.badSoft, padding: S.md, borderRadius: R.sm },
  error: { color: C.bad, flex: 1, ...T.small },
  note: { ...T.small, color: C.faint, marginTop: S.md, textAlign: 'center' },
  sample: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.lg,
    marginBottom: S.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  sampleCode: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  sampleCodeText: { fontFamily: F.display, color: C.text, fontSize: 13 },
  sampleTitle: { color: C.text, fontSize: 15, fontFamily: F.bold },
  sampleSub: { ...T.small, color: C.muted, marginTop: 1 },
  footnote: { ...T.small, color: C.faint, marginTop: S.sm, fontSize: 12 },
});
