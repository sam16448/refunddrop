import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { DateField } from '@/components/DateField';
import { Button, Card, Screen, SectionLabel, StatTile } from '@/components/ui';
import { SAMPLE_FLIGHTS, type SampleFlight } from '@/data/sampleFlights';
import { isValidDate, isValidFlightNumber, localTime } from '@/lib/format';
import { walletTotals } from '@/lib/money';
import { goToTab } from '@/lib/nav';
import { INTRO_SEEN_KEY } from '@/lib/storageKeys';
import { OUTCOME_CHIP } from '@/lib/outcome';
import type { FlightFacts } from '@/rules';
import { liveLookupEnabled, lookupFlight } from '@/services/flightLookup';
import { useClaim } from '@/state/claim';
import { useClaims } from '@/state/claims';
import { useEntitlements } from '@/state/entitlements';
import { useHistory, type RecentCheck } from '@/state/history';
import { C, F, R, S, T } from '@/theme';

function yesterdayLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


/** Decorative barcode drawn with bars, so no image asset is needed. */
function Barcode() {
  const widths = [3, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 3, 1, 1, 2, 3, 1, 2];
  return (
    <View style={styles.barcode}>
      {widths.map((w, i) => (
        <View key={i} style={{ width: w * 1.6, height: 26, backgroundColor: i % 5 === 2 ? C.accent : C.text, opacity: 0.9 }} />
      ))}
      <View style={styles.laser} />
    </View>
  );
}

function RecentRow({ r, onPress }: { r: RecentCheck; onPress: () => void }) {
  const chip = OUTCOME_CHIP[r.outcome];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]} accessibilityRole="button">
      <View style={styles.routeChip}>
        <Text style={styles.routeText}>{r.facts.origin.iata}</Text>
        <Ionicons name="arrow-forward" size={11} color={C.faint} />
        <Text style={styles.routeText}>{r.facts.destination.iata}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{r.facts.flightNumber}</Text>
        <Text style={[styles.rowSub, { color: chip.color }]}>{chip.label}</Text>
      </View>
      {r.amountText ? <Text style={styles.rowAmount}>{r.amountText}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={C.faint} />
    </Pressable>
  );
}

export default function CheckScreen() {
  const { setFlight, setPassenger, setExperience } = useClaim();
  const { claims } = useClaims();
  const { recent } = useHistory();
  const ent = useEntitlements();
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

  const reopen = (r: RecentCheck) => {
    setFlight(r.facts, r.source, r.answers);
    setExperience(r.experience);
    setPassenger(r.passenger);
    router.push('/verdict');
  };

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

  const wallet = walletTotals(claims);
  const planLabel = ent.pro ? 'Frequent Flyer' : ent.credits > 0 ? `${ent.credits} Kit credit${ent.credits > 1 ? 's' : ''}` : 'Free';

  return (
    <Screen tab>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <Image source={require('../../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.brand}>RefundDrop</Text>
        </View>
        <Pressable onPress={() => goToTab('/you')} style={styles.planPill} hitSlop={8} accessibilityLabel="Your plan">
          <Ionicons name={ent.pro ? 'star' : 'person-circle-outline'} size={15} color={ent.pro ? C.accent : C.text} />
          <Text style={styles.planText}>{planLabel}</Text>
        </Pressable>
      </View>

      <Animated.View entering={FadeInDown.duration(450)}>
        <Text style={styles.hero}>
          Flight delayed or cancelled?{'\n'}
          <Text style={{ color: C.accent }}>Get what you’re owed.</Text>
        </Text>
        <Text style={styles.sub}>Free check under EU, UK and US rules. Claim it yourself and keep 100%.</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(450)} style={{ marginTop: S.xl }}>
        <Pressable
          onPress={() => router.push('/scan')}
          style={({ pressed }) => [pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 }]}
          accessibilityRole="button"
          accessibilityLabel="Scan boarding pass"
        >
          <LinearGradient colors={['#2A2210', '#141B2C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scanCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={styles.fastest}>
                <View style={styles.dot} />
                <Text style={styles.fastestText}>FASTEST</Text>
              </View>
              <Barcode />
            </View>
            <Text style={styles.scanTitle}>Scan boarding pass</Text>
            <Text style={styles.scanSub}>Paper or phone. Reads flight, date, name and booking reference, right on your phone.</Text>
            <View style={styles.scanFoot}>
              <Ionicons name="camera-outline" size={18} color={C.text} />
              <Text style={styles.scanFootText}>Open scanner</Text>
              <View style={styles.scanArrow}>
                <Ionicons name="arrow-forward" size={16} color={C.accentInk} />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(140).duration(450)} style={styles.stats}>
        {claims.length ? (
          <>
            <StatTile label="Being claimed" value={wallet.open} caption={`${wallet.openCount} open claim${wallet.openCount === 1 ? '' : 's'}`} color={C.accent} icon="time-outline" />
            <StatTile label="Received" value={wallet.received} caption={`${wallet.paidCount} paid`} color={C.good} icon="checkmark-circle-outline" />
          </>
        ) : (
          <>
            <StatTile label="EU / UK delays" value="€600" caption="max per passenger" color={C.accent} icon="flash-outline" />
            <StatTile label="Claim companies" value="−35%" caption="you keep 100%" color={C.bad} icon="shield-checkmark-outline" />
          </>
        )}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(450)}>
        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>OR ENTER YOUR FLIGHT</Text>
          <View style={styles.line} />
        </View>
        <Card>
          <Text style={styles.inputLabel}>Flight number</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="airplane" size={18} color={C.faint} />
            <TextInput
              value={number}
              onChangeText={setNumber}
              placeholder="e.g. LH 756"
              placeholderTextColor={C.faint}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
              returnKeyType="search"
              onSubmitEditing={check}
            />
          </View>
          <Text style={[styles.inputLabel, { marginTop: S.lg }]}>Departure date</Text>
          <DateField value={date} onChange={setDate} />
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={C.bad} />
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}
          <View style={{ marginTop: S.lg }}>
            <Button title="Check my flight" icon="search" onPress={check} loading={loading} />
          </View>
          {!liveLookupEnabled ? <Text style={styles.note}>Live lookup is off in this build — sample flights work offline.</Text> : null}
        </Card>

        {legs ? (
          <>
            <SectionLabel>Which flight were you on?</SectionLabel>
            {legs.map((f, i) => (
              <Pressable key={i} onPress={() => open(f, 'live')} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>
                    {f.origin.iata} → {f.destination.iata}
                  </Text>
                  <Text style={styles.rowSub}>
                    Departs {localTime(f.scheduledDepartureUtc, f.origin.tz)} · {f.origin.city} to {f.destination.city}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.muted} />
              </Pressable>
            ))}
          </>
        ) : null}
      </Animated.View>

      {recent.length ? (
        <Animated.View entering={FadeInDown.delay(240).duration(450)}>
          <SectionLabel>Recent checks</SectionLabel>
          {recent.map((r) => (
            <RecentRow key={r.key} r={r} onPress={() => reopen(r)} />
          ))}
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(280).duration(450)}>
        <SectionLabel>Try a sample flight</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingRight: S.xl }} style={{ marginHorizontal: -S.xl, paddingLeft: S.xl }}>
          {SAMPLE_FLIGHTS.map((s) => (
            <Pressable key={s.id} onPress={() => openSample(s)} style={({ pressed }) => [styles.sample, pressed && { opacity: 0.75 }]}>
              <Text style={styles.sampleRoute}>
                {s.facts.origin.iata} → {s.facts.destination.iata}
              </Text>
              <Text style={styles.sampleFlight}>{s.facts.flightNumber}</Text>
              <Text style={styles.sampleSub} numberOfLines={2}>
                {s.subtitle}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={styles.footnote}>Samples use real routes with illustrative disruptions. Not legal advice.</Text>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  logo: { width: 34, height: 34, borderRadius: 10 },
  brand: { color: C.text, fontSize: 19, fontFamily: F.display },
  planPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  planText: { color: C.text, fontFamily: F.bold, fontSize: 12.5 },
  hero: { fontFamily: F.display, color: C.text, fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  sub: { ...T.body, color: C.muted, marginTop: S.md },
  scanCard: { borderRadius: R.xl, padding: S.xl, borderWidth: 1, borderColor: 'rgba(255,176,32,0.35)' },
  fastest: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
  fastestText: { color: C.accent, fontFamily: F.black, fontSize: 10, letterSpacing: 1.2 },
  scanTitle: { color: C.text, fontFamily: F.display, fontSize: 24, marginTop: S.md },
  scanSub: { ...T.small, color: C.muted, marginTop: S.xs },
  barcode: { flexDirection: 'row', gap: 2, backgroundColor: '#0A0F1C', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: C.line, alignItems: 'center', overflow: 'hidden' },
  laser: { position: 'absolute', left: 6, right: 6, top: '50%', height: 2, backgroundColor: C.accent, shadowColor: C.accent, shadowOpacity: 1, shadowRadius: 6 },
  scanFoot: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.lg, paddingTop: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },
  scanFootText: { color: C.text, fontFamily: F.semibold, fontSize: 15, flex: 1 },
  scanArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: S.md, marginTop: S.md },
  divider: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.xl, marginBottom: S.lg },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.line },
  dividerText: { ...T.label, color: C.faint, fontSize: 10 },
  inputLabel: { ...T.label, color: C.muted, marginBottom: S.sm },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.bg, borderRadius: R.md, borderWidth: 1, borderColor: C.line, paddingHorizontal: S.lg, height: 56 },
  input: { flex: 1, color: C.text, fontSize: 22, fontFamily: F.display, letterSpacing: 1.5, height: '100%' },
  errorBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: S.md, backgroundColor: C.badSoft, padding: S.md, borderRadius: R.sm },
  error: { color: C.bad, flex: 1, ...T.small },
  note: { ...T.small, color: C.faint, marginTop: S.md, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.surface, borderRadius: R.md, padding: S.lg, marginBottom: S.sm, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  routeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6 },
  routeText: { fontFamily: F.display, color: C.text, fontSize: 13 },
  rowTitle: { color: C.text, fontSize: 15, fontFamily: F.bold },
  rowSub: { ...T.small, color: C.muted, marginTop: 1 },
  rowAmount: { fontFamily: F.display, color: C.accent, fontSize: 17 },
  sample: { width: 168, backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  sampleRoute: { fontFamily: F.display, color: C.accent, fontSize: 13, letterSpacing: 0.5 },
  sampleFlight: { color: C.text, fontFamily: F.bold, fontSize: 16, marginTop: 4 },
  sampleSub: { ...T.small, color: C.muted, marginTop: 2, fontSize: 12 },
  footnote: { ...T.small, color: C.faint, marginTop: S.md, fontSize: 12 },
});
