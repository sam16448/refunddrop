import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { DateField } from '@/components/DateField';
import { Button, HeaderButton, IconBadge, Logo, Screen, SectionLabel, Tag } from '@/components/ui';
import { SAMPLE_FLIGHTS, type SampleFlight } from '@/data/sampleFlights';
import { isValidDate, isValidFlightNumber, localTime } from '@/lib/format';
import { agencySavings, claimValue, walletTotals } from '@/lib/money';
import { goToTab } from '@/lib/nav';
import { OUTCOME_CHIP } from '@/lib/outcome';
import { INTRO_SEEN_KEY } from '@/lib/storageKeys';
import { evaluate, formatMoney, type FlightFacts } from '@/rules';
import { liveLookupEnabled, lookupFlight } from '@/services/flightLookup';
import { useClaim } from '@/state/claim';
import { useClaims, type ClaimStatus, type SavedClaim } from '@/state/claims';
import { useEntitlements } from '@/state/entitlements';
import { useHistory, type RecentCheck } from '@/state/history';
import { C, F, GOLD_GLOW, R, S, SHADOW, T } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function yesterdayLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const CLAIM_STATUS: Record<ClaimStatus, { tag: string; tone: 'gold' | 'blue' | 'green' | 'red'; caption: string; icon: IconName }> = {
  drafted: { tag: 'Ready to send', tone: 'gold', caption: 'Letter ready', icon: 'paper-plane-outline' },
  sent: { tag: 'Submitted', tone: 'blue', caption: 'Awaiting airline', icon: 'time-outline' },
  replied: { tag: 'Airline replied', tone: 'blue', caption: 'Check the reply', icon: 'mail-open-outline' },
  rejected: { tag: 'Rejected', tone: 'red', caption: 'Escalate for free', icon: 'megaphone-outline' },
  paid: { tag: 'Paid', tone: 'green', caption: 'Completed', icon: 'checkmark-circle' },
};

/** What each sample flight is worth, worked out by the real rules engine. */
function sampleBadge(s: SampleFlight): { text: string; money: boolean } {
  const v = evaluate(s.facts, s.demoAnswers);
  if (v.estimate && (v.outcome === 'likely' || v.outcome === 'possible')) return { text: formatMoney(v.estimate.perPassenger), money: true };
  return { text: OUTCOME_CHIP[v.outcome].label, money: false };
}

function ClaimRow({ claim }: { claim: SavedClaim }) {
  const st = CLAIM_STATUS[claim.status];
  const value = claimValue(claim);
  const paid = claim.status === 'paid';
  return (
    <Pressable onPress={() => goToTab('/claims')} style={({ pressed }) => [styles.claimRow, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      <IconBadge name={paid ? 'checkmark-done' : 'airplane'} color={paid ? C.good : C.blue} bg={paid ? C.goodSoft : C.accentSoft} />
      <View style={{ flex: 1 }}>
        <Text style={styles.claimTitle} numberOfLines={1}>
          {claim.facts.operatingCarrier.name} {claim.facts.flightNumber}
        </Text>
        <Text style={styles.claimSub} numberOfLines={1}>
          {claim.facts.origin.iata} → {claim.facts.destination.iata}
        </Text>
        <Tag text={st.tag} tone={st.tone} style={{ marginTop: 6 }} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        {value ? <Text style={[styles.claimAmount, paid && { color: C.good }]}>{formatMoney(value)}</Text> : null}
        <Text style={styles.claimCaption}>{st.caption}</Text>
      </View>
    </Pressable>
  );
}

function RecentRow({ r, onPress }: { r: RecentCheck; onPress: () => void }) {
  const chip = OUTCOME_CHIP[r.outcome];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.claimRow, pressed && { opacity: 0.8 }]} accessibilityRole="button">
      <IconBadge name="time-outline" />
      <View style={{ flex: 1 }}>
        <Text style={styles.claimTitle}>{r.facts.flightNumber}</Text>
        <Text style={styles.claimSub}>
          {r.facts.origin.iata} → {r.facts.destination.iata} · <Text style={{ color: chip.color, fontFamily: F.bold }}>{chip.label}</Text>
        </Text>
      </View>
      {r.amountText ? <Text style={styles.claimAmount}>{r.amountText}</Text> : null}
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
  const samples = useMemo(() => SAMPLE_FLIGHTS.map((s) => ({ s, badge: sampleBadge(s) })), []);

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
  const hasClaims = claims.length > 0;
  const sortedClaims = [...claims].sort((a, b) => Number(a.status === 'paid') - Number(b.status === 'paid')).slice(0, 3);
  const planLabel = ent.pro ? 'Frequent Flyer' : ent.credits > 0 ? `${ent.credits} Kit credit${ent.credits > 1 ? 's' : ''}` : 'Free plan';

  const header = (
    <View>
      <View style={styles.topRow}>
        <Logo sub="Flight compensation" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Pressable onPress={() => goToTab(hasClaims ? '/claims' : '/you')} style={styles.walletPill} hitSlop={6} accessibilityRole="button">
            <Ionicons name={hasClaims ? 'cash-outline' : ent.pro ? 'star' : 'sparkles-outline'} size={16} color={C.gold} />
            <Text style={styles.walletPillText} numberOfLines={1}>
              {hasClaims ? wallet.open : planLabel}
            </Text>
          </Pressable>
          <HeaderButton icon="person-outline" label="Profile" onPress={() => goToTab('/you')} />
        </View>
      </View>
      <Text style={styles.hero}>
        Flight delayed or cancelled?{'\n'}
        <Text style={{ color: C.gold }}>Get what you’re owed.</Text>
      </Text>
    </View>
  );

  return (
    <Screen tab header={header} overlap={56}>
      {/* Wallet */}
      <Animated.View entering={FadeInDown.duration(450)} style={styles.card}>
        <View style={styles.cardHead}>
          <View style={styles.liveDot} />
          <Text style={[T.label, { color: C.text, flex: 1, fontSize: 10.5 }]} numberOfLines={1}>
            {hasClaims ? 'Your flight money' : 'What you could claim'}
          </Text>
          <Tag text="EU261 / UK261" tone="gold" icon="shield-checkmark" />
        </View>
        <View style={styles.walletCols}>
          <View style={{ flex: 1 }}>
            <Text style={styles.colLabel}>{hasClaims ? 'Being claimed' : 'Up to'}</Text>
            <Text style={[styles.colValue, { color: C.blue }]} numberOfLines={1} adjustsFontSizeToFit>
              {hasClaims ? wallet.open : '€600'}
            </Text>
            <Text style={styles.colCaption}>
              {hasClaims ? `${wallet.openCount} open claim${wallet.openCount === 1 ? '' : 's'}` : 'per passenger, EU & UK'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.colLabel}>{hasClaims ? 'Received' : 'You keep'}</Text>
            <Text style={styles.colValue} numberOfLines={1} adjustsFontSizeToFit>
              {hasClaims ? wallet.received : '100%'}
            </Text>
            <Text style={[styles.colCaption, { color: '#8A6D00', fontFamily: F.bold }]}>
              {hasClaims ? `${wallet.paidCount} paid · 100% kept` : 'no commission'}
            </Text>
          </View>
        </View>
        <View style={styles.savings}>
          <View style={styles.coin}>
            <Ionicons name="wallet" size={14} color={C.text} />
          </View>
          <Text style={styles.savingsText} numberOfLines={2}>
            {hasClaims ? `${agencySavings(claims)} kept from claim companies` : 'Claim companies take ~35%. You don’t have to.'}
          </Text>
          <Tag text="0% fee" tone="blue" />
        </View>
      </Animated.View>

      {/* Scan */}
      <Animated.View entering={FadeInDown.delay(80).duration(450)}>
        <Pressable onPress={() => router.push('/scan')} accessibilityRole="button" accessibilityLabel="Scan boarding pass" style={({ pressed }) => [styles.scanCard, pressed && { transform: [{ scale: 0.99 }] }]}>
          <Ionicons name="qr-code" size={150} color="rgba(9,37,112,0.07)" style={styles.scanWatermark} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm }}>
            <Tag text="Boarding pass scan" tone="white" icon="camera-outline" style={{ flexShrink: 1 }} />
            <Tag text="Fastest" tone="navy" />
          </View>
          <Text style={styles.scanTitle}>Scan & check{'\n'}in seconds</Text>
          <Text style={styles.scanSub}>Point your camera at the barcode on a paper or phone boarding pass.</Text>
          <View style={{ marginTop: S.lg }}>
            <Button title="Open scanner" iconRight="arrow-forward" onPress={() => router.push('/scan')} />
          </View>
        </Pressable>
      </Animated.View>

      {/* Manual entry */}
      <Animated.View entering={FadeInDown.delay(140).duration(450)} style={styles.card}>
        <View style={[styles.cardHead, { marginBottom: S.lg }]}>
          <Ionicons name="create-outline" size={20} color={C.blue} />
          <Text style={styles.cardTitle}>Or enter your flight</Text>
          <Tag text="Free check" tone="grey" />
        </View>
        <Text style={styles.inputLabel}>Flight number</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="airplane" size={18} color={C.muted} />
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
          <Button title="Check flight eligibility" iconRight="shield-checkmark-outline" onPress={check} loading={loading} />
        </View>
        {!liveLookupEnabled ? <Text style={styles.note}>Live lookup is off in this build — sample flights work offline.</Text> : null}
      </Animated.View>

      {legs ? (
        <>
          <SectionLabel>Which flight were you on?</SectionLabel>
          {legs.map((f, i) => (
            <Pressable key={i} onPress={() => open(f, 'live')} style={({ pressed }) => [styles.claimRow, pressed && { opacity: 0.8 }]}>
              <IconBadge name="airplane" />
              <View style={{ flex: 1 }}>
                <Text style={styles.claimTitle}>
                  {f.origin.iata} → {f.destination.iata}
                </Text>
                <Text style={styles.claimSub}>
                  Departs {localTime(f.scheduledDepartureUtc, f.origin.tz)} · {f.origin.city} to {f.destination.city}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.faint} />
            </Pressable>
          ))}
        </>
      ) : null}

      {/* Samples */}
      <Animated.View entering={FadeInDown.delay(200).duration(450)}>
        <SectionLabel right={<Text style={styles.link}>Tap to test</Text>}>Sample disruptions</SectionLabel>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: S.md, paddingHorizontal: S.lg, paddingBottom: S.md }}
          style={{ marginHorizontal: -S.lg }}
        >
          {samples.map(({ s, badge }) => {
            const cancelled = s.facts.status === 'cancelled';
            return (
              <Pressable key={s.id} onPress={() => openSample(s)} style={({ pressed }) => [styles.sample, pressed && { opacity: 0.8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm }}>
                  <Text style={styles.sampleFlight}>{s.facts.flightNumber}</Text>
                  <Tag text={badge.text} tone={badge.money ? 'gold' : 'grey'} />
                </View>
                <Text style={styles.sampleRoute}>
                  {s.facts.origin.iata} → {s.facts.destination.iata}
                </Text>
                <View style={styles.sampleStatus}>
                  <Ionicons name={cancelled ? 'close-circle-outline' : 'time-outline'} size={14} color={C.bad} />
                  <Text style={styles.sampleStatusText} numberOfLines={2}>
                    {s.subtitle}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Claims */}
      {hasClaims ? (
        <Animated.View entering={FadeInDown.delay(240).duration(450)}>
          <SectionLabel right={<Tag text={`${wallet.openCount} active`} tone="gold" />}>Your claims</SectionLabel>
          {sortedClaims.map((c) => (
            <ClaimRow key={c.id} claim={c} />
          ))}
        </Animated.View>
      ) : null}

      {recent.length ? (
        <Animated.View entering={FadeInDown.delay(280).duration(450)}>
          <SectionLabel>Recent checks</SectionLabel>
          {recent.map((r) => (
            <RecentRow key={r.key} r={r} onPress={() => reopen(r)} />
          ))}
        </Animated.View>
      ) : null}

      <View style={styles.trust}>
        <Ionicons name="shield-half-outline" size={22} color={C.blue} />
        <View style={{ flex: 1 }}>
          <Text style={styles.trustTitle}>Built on the actual rules</Text>
          <Text style={styles.trustBody}>EU Regulation 261/2004, UK261 and US DOT refund rules. Samples are illustrative. Information, not legal advice.</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.sm },
  walletPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.blueGlass, maxWidth: 150 },
  walletPillText: { color: C.onBlue, fontFamily: F.black, fontSize: 14, flexShrink: 1 },
  hero: { fontFamily: F.display, color: C.onBlue, fontSize: 28, lineHeight: 33, letterSpacing: -0.8, marginTop: S.xl },
  card: { backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl, marginBottom: S.lg, ...SHADOW },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  cardTitle: { flex: 1, color: C.text, fontFamily: F.black, fontSize: 17, letterSpacing: -0.3 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.blue },
  walletCols: { flexDirection: 'row', gap: S.lg, marginTop: S.lg },
  colLabel: { color: C.text, fontFamily: F.bold, fontSize: 13 },
  colValue: { fontFamily: F.display, color: C.text, fontSize: 32, letterSpacing: -1, marginTop: 2 },
  colCaption: { ...T.small, color: C.muted, fontSize: 12 },
  savings: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.bg, borderRadius: R.md, padding: S.md, marginTop: S.lg },
  coin: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  savingsText: { flex: 1, color: C.text, fontFamily: F.bold, fontSize: 13 },
  scanCard: { backgroundColor: C.gold, borderRadius: R.xl, padding: S.xl, marginBottom: S.lg, overflow: 'hidden', ...GOLD_GLOW },
  scanWatermark: { position: 'absolute', right: -20, bottom: 50 },
  scanTitle: { fontFamily: F.display, color: C.text, fontSize: 30, lineHeight: 34, letterSpacing: -0.9, marginTop: S.lg },
  scanSub: { ...T.body, color: '#3B3200', marginTop: S.sm },
  inputLabel: { ...T.label, color: C.text, marginBottom: S.sm },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.bg, borderRadius: R.md, paddingHorizontal: S.lg, height: 56 },
  input: { flex: 1, color: C.text, fontSize: 20, fontFamily: F.black, letterSpacing: 1, height: '100%' },
  errorBox: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', marginTop: S.md, backgroundColor: C.badSoft, padding: S.md, borderRadius: R.sm },
  error: { color: C.bad, flex: 1, ...T.small },
  note: { ...T.small, color: C.faint, marginTop: S.md, textAlign: 'center' },
  link: { color: C.blue, fontFamily: F.bold, fontSize: 13 },
  sample: { width: 196, backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, ...SHADOW },
  sampleFlight: { color: C.text, fontFamily: F.black, fontSize: 17 },
  sampleRoute: { color: C.muted, fontFamily: F.semibold, fontSize: 13, marginTop: 4 },
  sampleStatus: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: S.sm },
  sampleStatusText: { color: C.bad, fontFamily: F.bold, fontSize: 12, flex: 1 },
  claimRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, marginBottom: S.md, ...SHADOW },
  claimTitle: { color: C.text, fontSize: 16, fontFamily: F.black, letterSpacing: -0.2 },
  claimSub: { ...T.small, color: C.muted, marginTop: 1 },
  claimAmount: { fontFamily: F.display, color: C.blue, fontSize: 19, letterSpacing: -0.4 },
  claimCaption: { color: C.muted, fontFamily: F.semibold, fontSize: 12, marginTop: 2 },
  trust: { flexDirection: 'row', gap: S.md, alignItems: 'center', backgroundColor: C.surfaceHi, borderRadius: R.lg, padding: S.lg, marginTop: S.xl },
  trustTitle: { color: C.text, fontFamily: F.black, fontSize: 14 },
  trustBody: { ...T.small, color: C.muted, fontSize: 12, marginTop: 2 },
});
