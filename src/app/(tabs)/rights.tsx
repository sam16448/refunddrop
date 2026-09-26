import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Button, IconBadge, PageHeader, Screen, Segmented, SectionLabel } from '@/components/ui';
import { EU261_V2004, UK261_V2021, US_DOT_2024 } from '@/rules';
import { C, F, GOLD_GLOW, R, S, SHADOW, T } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
type Section = 'airport' | 'owed' | 'claim';

const CHECKLIST_KEY = 'refunddrop.airportChecklist.v1';

const CHECKLIST: { id: string; icon: IconName; title: string; body: string }[] = [
  { id: 'cause', icon: 'chatbox-ellipses-outline', title: 'Ask why it’s delayed — in writing', body: 'The cause decides whether you’re owed money. Ask the gate or check-in desk and note what they say.' },
  { id: 'pass', icon: 'ticket-outline', title: 'Keep your boarding pass', body: 'Keep the paper pass or screenshot the mobile one. It proves you were there.' },
  { id: 'board', icon: 'camera-outline', title: 'Photograph the departures board', body: 'A timestamped photo of the delay or cancellation is strong evidence.' },
  { id: 'arrival', icon: 'time-outline', title: 'Note when the doors open at arrival', body: 'Delay is measured when the doors open at your final destination, not at take-off.' },
  { id: 'receipts', icon: 'receipt-outline', title: 'Keep every receipt', body: 'Food, drinks, taxis and hotels can be claimed back on top of compensation.' },
  { id: 'vouchers', icon: 'hand-left-outline', title: 'Don’t accept vouchers instead of cash', body: 'Compensation is paid in money unless you agree in writing to vouchers (Art. 7(3)). Don’t sign anything that waives your rights.' },
];

const CARE: { icon: IconName; title: string; body: string }[] = [
  { icon: 'restaurant-outline', title: 'Meals and drinks', body: 'After 2h (flights up to 1,500 km), 3h (up to 3,500 km) or 4h (longer).' },
  { icon: 'call-outline', title: 'Two calls or emails', body: 'The airline must let you contact someone for free.' },
  { icon: 'bed-outline', title: 'Hotel and transport', body: 'If you’re stuck overnight, the airline pays for the hotel and getting there.' },
];

const SITUATIONS: { icon: IconName; title: string; body: string; rule: string }[] = [
  { icon: 'time-outline', title: 'Arrived 3+ hours late', body: 'Compensation by distance, unless the cause was truly outside the airline’s control.', rule: 'Art. 7 · Sturgeon C-402/07' },
  { icon: 'close-circle-outline', title: 'Cancelled with under 14 days’ notice', body: 'Refund or new flight, plus compensation unless the replacement flight was close to the original times.', rule: 'Art. 5(1)(c)' },
  { icon: 'people-outline', title: 'Bumped from an overbooked flight', body: 'Full compensation straight away if you didn’t volunteer. The airline must ask for volunteers first.', rule: 'Art. 4' },
  { icon: 'git-branch-outline', title: 'Missed a connection', body: 'On one booking, what counts is the delay at your final destination — even if the late leg was outside Europe.', rule: 'Art. 2(h) · Folkerts C-11/11' },
  { icon: 'arrow-down-circle-outline', title: 'Downgraded to a lower class', body: '30%, 50% or 75% of that flight’s ticket price back, depending on distance.', rule: 'Art. 10' },
  { icon: 'flag-outline', title: 'US flights', body: `No cash compensation for delays, but a full refund if cancelled or delayed ${US_DOT_2024.domesticSignificantDelayMinutes / 60}h+ (domestic) / ${US_DOT_2024.internationalSignificantDelayMinutes / 60}h+ (international) and you didn’t travel.`, rule: '14 CFR 260' },
];

const CAUSES_OWED = ['Technical faults', 'Crew shortage or sickness', 'Airline staff strike', 'Late incoming plane', 'Overbooking'];
const CAUSES_NOT = ['Severe weather', 'Air traffic control limits', 'Airport or ATC strikes', 'Security threats', 'Bird strikes'];

const CLAIM_STEPS: { title: string; body: string }[] = [
  { title: 'Check your flight', body: 'Get an honest answer with the rule behind every step. Free.' },
  { title: 'Claim from the operating airline', body: 'Not the travel agent, and not the airline that only sold the ticket (codeshare).' },
  { title: 'Wait about two weeks', body: 'Most airlines reply within weeks. If they don’t, send a follow-up citing your first letter.' },
  { title: 'Escalate if refused', body: 'Complain to the national enforcement body or an approved dispute scheme. It’s free.' },
  { title: 'Court as a last resort', body: 'Small-claims courts handle EU261 cases often. Check the cost and time limit where you are.' },
];

const TIME_LIMITS: [string, string][] = [
  ['UK (England & Wales)', '6 years'],
  ['Scotland', '5 years'],
  ['Germany', '3 years (from end of year)'],
  ['France · Spain', '5 years'],
];

const SOURCES: { title: string; url: string }[] = [
  { title: 'Regulation (EC) 261/2004', url: 'https://eur-lex.europa.eu/eli/reg/2004/261/oj' },
  { title: 'Your Europe: air passenger rights', url: 'https://europa.eu/youreurope/citizens/travel/passenger-rights/air/index_en.htm' },
  { title: 'UK CAA: delays', url: 'https://www.caa.co.uk/air-passengers/travel-problems-and-rights/flight-delays-and-cancellations/delays/' },
  { title: 'US DOT: refunds', url: 'https://www.transportation.gov/airconsumer/refunds' },
];

function Block({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.block, style]}>{children}</View>;
}

function AirportSection() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    AsyncStorage.getItem(CHECKLIST_KEY)
      .then((raw) => raw && setDone(JSON.parse(raw)))
      .catch(() => {});
  }, []);
  const toggle = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };
  const count = CHECKLIST.filter((c) => done[c.id]).length;

  return (
    <Animated.View entering={FadeIn.duration(250)}>
      <View style={styles.banner}>
        <IconBadge name="alert-circle" size={20} color={C.gold} bg={C.text} />
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle}>Delayed right now?</Text>
          <Text style={styles.bannerBody}>Do these before you leave the airport. They make your claim much stronger.</Text>
        </View>
      </View>

      <SectionLabel right={<Text style={styles.count}>{count}/{CHECKLIST.length}</Text>}>Airport checklist</SectionLabel>
      <Block style={{ paddingVertical: S.xs }}>
        {CHECKLIST.map((c, i) => {
          const on = Boolean(done[c.id]);
          return (
            <Pressable
              key={c.id}
              onPress={() => toggle(c.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.check, i < CHECKLIST.length - 1 && styles.divider]}
            >
              <View style={[styles.box, on && styles.boxOn]}>{on ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}</View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.checkTitle, on && styles.checkDone]}>{c.title}</Text>
                <Text style={styles.checkBody}>{c.body}</Text>
              </View>
            </Pressable>
          );
        })}
      </Block>

      <SectionLabel>Care you’re owed while you wait</SectionLabel>
      <View style={{ gap: S.sm }}>
        {CARE.map((c) => (
          <View key={c.title} style={styles.tile}>
            <IconBadge name={c.icon} size={18} color={C.good} bg={C.goodSoft} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tileTitle}>{c.title}</Text>
              <Text style={styles.tileBody}>{c.body}</Text>
            </View>
          </View>
        ))}
      </View>
      <Text style={styles.fine}>EU261 / UK261 Art. 9. Applies whatever caused the delay — even bad weather.</Text>

      <SectionLabel>Flight cancelled?</SectionLabel>
      <Block>
        <Text style={styles.para}>
          You choose: a <Text style={styles.strong}>full refund within 7 days</Text>, or a{' '}
          <Text style={styles.strong}>new flight</Text> at the earliest opportunity or a later date you prefer (Art. 8). Take a
          photo of any rebooking offer before you accept it.
        </Text>
      </Block>
    </Animated.View>
  );
}

function AmountTable() {
  const rows: [string, number, number][] = [
    [`Up to ${EU261_V2004.shortMaxKm.toLocaleString('en-US')} km`, EU261_V2004.amounts.short, UK261_V2021.amounts.short],
    [`${EU261_V2004.shortMaxKm.toLocaleString('en-US')}–${EU261_V2004.mediumMaxKm.toLocaleString('en-US')} km*`, EU261_V2004.amounts.medium, UK261_V2021.amounts.medium],
    [`Over ${EU261_V2004.mediumMaxKm.toLocaleString('en-US')} km`, EU261_V2004.amounts.long, UK261_V2021.amounts.long],
  ];
  return (
    <Block style={{ paddingVertical: S.sm }}>
      <View style={[styles.tr, styles.divider]}>
        <Text style={[styles.th, { flex: 1.4 }]}>Distance</Text>
        <Text style={styles.th}>EU261</Text>
        <Text style={styles.th}>UK261</Text>
      </View>
      {rows.map(([d, eu, uk], i) => (
        <View key={d} style={[styles.tr, i < rows.length - 1 && styles.divider]}>
          <Text style={[styles.td, { flex: 1.4 }]}>{d}</Text>
          <Text style={styles.money}>€{eu}</Text>
          <Text style={styles.money}>£{uk}</Text>
        </View>
      ))}
    </Block>
  );
}

function OwedSection() {
  return (
    <Animated.View entering={FadeIn.duration(250)}>
      <SectionLabel>How much</SectionLabel>
      <AmountTable />
      <Text style={styles.fine}>
        Per passenger, including children. *Flights within the EU (or UK) over 1,500 km get the middle amount. Can be halved if a
        replacement flight got you there close to the original time.
      </Text>

      <SectionLabel>When you’re owed it</SectionLabel>
      <View style={{ gap: S.sm }}>
        {SITUATIONS.map((s) => (
          <View key={s.title} style={styles.tile}>
            <IconBadge name={s.icon} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.tileTitle}>{s.title}</Text>
              <Text style={styles.tileBody}>{s.body}</Text>
              <Text style={styles.cite}>{s.rule}</Text>
            </View>
          </View>
        ))}
      </View>

      <SectionLabel>Which flights are covered</SectionLabel>
      <Block>
        <Text style={styles.para}>
          <Text style={styles.strong}>EU261:</Text> any flight leaving an EU, Iceland, Norway or Switzerland airport, and flights
          into one on an airline licensed there.{'\n\n'}
          <Text style={styles.strong}>UK261:</Text> any flight leaving the UK, and flights into the UK on a UK or EU airline.
        </Text>
      </Block>

      <SectionLabel>What the airline can’t blame</SectionLabel>
      <View style={styles.causes}>
        <View style={[styles.causeCol, { borderColor: 'rgba(16,185,129,0.35)' }]}>
          <Text style={[styles.causeHead, { color: C.good }]}>You’re still owed</Text>
          {CAUSES_OWED.map((c) => (
            <View key={c} style={styles.causeRow}>
              <Ionicons name="checkmark-circle" size={14} color={C.good} />
              <Text style={styles.causeText}>{c}</Text>
            </View>
          ))}
        </View>
        <View style={styles.causeCol}>
          <Text style={[styles.causeHead, { color: C.muted }]}>Usually excused</Text>
          {CAUSES_NOT.map((c) => (
            <View key={c} style={styles.causeRow}>
              <Ionicons name="remove-circle" size={14} color={C.faint} />
              <Text style={styles.causeText}>{c}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={styles.fine}>Wallentin-Hermann C-549/07 · Airhelp v SAS C-28/20. The airline has to prove an excuse.</Text>
    </Animated.View>
  );
}

function ClaimSection() {
  return (
    <Animated.View entering={FadeIn.duration(250)}>
      <SectionLabel>Five steps to getting paid</SectionLabel>
      <Block style={{ paddingVertical: S.sm }}>
        {CLAIM_STEPS.map((s, i) => (
          <View key={s.title} style={[styles.claimStep, i < CLAIM_STEPS.length - 1 && styles.divider]}>
            <View style={styles.num}>
              <Text style={styles.numText}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tileTitle}>{s.title}</Text>
              <Text style={styles.tileBody}>{s.body}</Text>
            </View>
          </View>
        ))}
      </Block>

      <View style={styles.compare}>
        <Ionicons name="wallet" size={20} color={C.text} />
        <Text style={styles.compareText}>
          Claim companies usually keep 25–50% of what you get. The Claim Kit writes all three letters for a flat{' '}
          <Text style={styles.strong}>$4.99</Text>, so the rest is yours.
        </Text>
      </View>

      <SectionLabel>How long you have</SectionLabel>
      <Block style={{ paddingVertical: S.sm }}>
        {TIME_LIMITS.map(([where, limit], i) => (
          <View key={where} style={[styles.tr, i < TIME_LIMITS.length - 1 && styles.divider]}>
            <Text style={[styles.td, { flex: 1.4 }]}>{where}</Text>
            <Text style={[styles.td, { textAlign: 'right', fontFamily: F.bold, color: C.text }]}>{limit}</Text>
          </View>
        ))}
      </Block>
      <Text style={styles.fine}>Limits are set by each country’s law and vary. Claim as soon as you can.</Text>

      <SectionLabel>Official sources</SectionLabel>
      <Block style={{ paddingVertical: S.xs }}>
        {SOURCES.map((s, i) => (
          <Pressable key={s.url} onPress={() => Linking.openURL(s.url).catch(() => {})} style={[styles.source, i < SOURCES.length - 1 && styles.divider]}>
            <Ionicons name="link-outline" size={17} color={C.info} />
            <Text style={styles.sourceText}>{s.title}</Text>
            <Ionicons name="open-outline" size={15} color={C.faint} />
          </Pressable>
        ))}
      </Block>
    </Animated.View>
  );
}

export default function RightsScreen() {
  const [section, setSection] = useState<Section>('airport');
  return (
    <Screen
      tab
      header={
        <View>
          <PageHeader title="Your rights" sub="What airlines owe you. Works offline." />
          <Animated.View entering={FadeInDown.duration(350)} style={{ marginTop: S.lg }}>
            <Segmented
              onBlue
              options={[
                { value: 'airport', label: 'At the airport' },
                { value: 'owed', label: 'What you get' },
                { value: 'claim', label: 'How to claim' },
              ]}
              value={section}
              onChange={setSection}
            />
          </Animated.View>
        </View>
      }
    >
      {section === 'airport' ? <AirportSection /> : section === 'owed' ? <OwedSection /> : <ClaimSection />}
      <View style={{ marginTop: S.xl }}>
        <Button title="Check my flight" iconRight="arrow-forward" onPress={() => router.navigate('/')} />
      </View>
      <Text style={[styles.fine, { textAlign: 'center' }]}>General information, not legal advice.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', gap: S.md, alignItems: 'center', backgroundColor: C.gold, borderRadius: R.xl, padding: S.lg, ...GOLD_GLOW },
  bannerTitle: { color: C.text, fontFamily: F.black, fontSize: 17 },
  bannerBody: { ...T.small, color: '#3B3200', marginTop: 2 },
  count: { color: C.blue, fontFamily: F.black, fontSize: 13 },
  block: { backgroundColor: C.surface, borderRadius: R.xl, paddingHorizontal: S.lg, ...SHADOW },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  check: { flexDirection: 'row', gap: S.md, paddingVertical: S.md, alignItems: 'flex-start' },
  box: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.faint, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: '#10B981', borderColor: '#10B981' },
  checkTitle: { color: C.text, fontFamily: F.bold, fontSize: 15 },
  checkDone: { color: C.muted, textDecorationLine: 'line-through' },
  checkBody: { ...T.small, color: C.muted, marginTop: 2 },
  tile: { flexDirection: 'row', gap: S.md, backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, ...SHADOW },
  tileTitle: { color: C.text, fontFamily: F.black, fontSize: 15 },
  tileBody: { ...T.small, color: C.muted, marginTop: 2 },
  cite: { alignSelf: 'flex-start', color: C.info, fontFamily: F.bold, fontSize: 11, marginTop: 6, backgroundColor: C.infoSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  fine: { ...T.small, color: C.faint, fontSize: 12, marginTop: S.sm },
  para: { ...T.body, color: C.muted, paddingVertical: S.lg },
  strong: { fontFamily: F.bold, color: C.text },
  tr: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.md },
  th: { ...T.label, color: C.muted, fontSize: 10, flex: 1 },
  td: { ...T.small, color: C.muted, flex: 1 },
  money: { fontFamily: F.display, color: C.blue, fontSize: 19, flex: 1, letterSpacing: -0.4 },
  causes: { flexDirection: 'row', gap: S.sm },
  causeCol: { flex: 1, backgroundColor: C.surface, borderRadius: R.lg, padding: S.md, gap: S.sm, borderWidth: 1.5, borderColor: 'transparent', ...SHADOW },
  causeHead: { fontFamily: F.black, fontSize: 13, marginBottom: 2 },
  causeRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  causeText: { ...T.small, color: C.text, flex: 1, fontSize: 12.5 },
  claimStep: { flexDirection: 'row', gap: S.md, paddingVertical: S.md },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: F.black, color: C.onBlue, fontSize: 13 },
  compare: { flexDirection: 'row', gap: S.md, alignItems: 'center', backgroundColor: C.goldSoft, borderRadius: R.lg, padding: S.lg, marginTop: S.md },
  compareText: { ...T.small, color: C.muted, flex: 1 },
  source: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  sourceText: { color: C.text, fontFamily: F.bold, fontSize: 14, flex: 1 },
});
