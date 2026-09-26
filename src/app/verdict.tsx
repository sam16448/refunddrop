import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BackBar, Button, HeaderButton, IconBadge, Screen, Tag } from '@/components/ui';
import { enforcementBody } from '@/claim/letters';
import { answersFor, effectiveFacts } from '@/lib/claim';
import { AGENCY_CUT } from '@/lib/money';
import { evaluate, formatDuration, formatMoney, type Outcome, type StepStatus, type Verdict } from '@/rules';
import { useClaim } from '@/state/claim';
import { flightKey, useEntitlements } from '@/state/entitlements';
import { useHistory } from '@/state/history';
import { C, F, GOLD_GLOW, R, S, SHADOW, T } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const VERDICT_TAG: Record<Outcome, { text: string; tone: 'gold' | 'white' | 'green' | 'grey' }> = {
  likely: { text: 'Verdict: you are likely owed cash', tone: 'gold' },
  possible: { text: 'Verdict: you may be owed cash', tone: 'gold' },
  refund_only: { text: 'Verdict: refund owed', tone: 'white' },
  not_eligible: { text: 'Verdict: no compensation', tone: 'white' },
  not_covered: { text: 'Not covered by these rules', tone: 'white' },
};

const PLAIN: Record<Outcome, { icon: IconName; color: string; bg: string; label: string }> = {
  likely: { icon: 'checkmark-circle', color: C.blue, bg: C.accentSoft, label: 'Likely eligible' },
  possible: { icon: 'help-circle', color: C.blue, bg: C.accentSoft, label: 'Possibly eligible' },
  refund_only: { icon: 'cash-outline', color: C.good, bg: C.goodSoft, label: 'Refund, not compensation' },
  not_eligible: { icon: 'close-circle', color: C.muted, bg: C.surfaceHi, label: 'Not eligible' },
  not_covered: { icon: 'remove-circle', color: C.muted, bg: C.surfaceHi, label: 'Not covered' },
};

const STEP_ICON: Record<StepStatus, { name: IconName; color: string }> = {
  pass: { name: 'checkmark-circle', color: C.good },
  fail: { name: 'close-circle', color: C.bad },
  unknown: { name: 'help-circle', color: C.blue },
  info: { name: 'ellipse', color: C.faint },
};

const LAW: Record<string, string> = {
  EU261: 'EU Regulation 261/2004',
  UK261: 'UK Regulation 261 (UK261)',
  US_DOT: 'US DOT refund rules',
};

/** Counts up from 0 to `target` over ~0.9s. */
function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) return;
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 900);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t === 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target]);
  return target <= 0 ? 0 : value;
}

function shareText(v: Verdict, flight: string, route: string): string {
  const base = `RefundDrop checked ${flight} (${route})`;
  if ((v.outcome === 'likely' || v.outcome === 'possible') && v.estimate) {
    return `${base}: ${v.outcome === 'likely' ? 'likely eligible for about' : 'possibly eligible for up to'} ${formatMoney(v.estimate.perPassenger)} per passenger under ${v.regime}. If you were on it too, check yours.`;
  }
  return `${base}: ${v.headline}.`;
}

export default function VerdictScreen() {
  const { facts, answers, experience, reset, source, passenger } = useClaim();
  const { isUnlocked, plans, pro } = useEntitlements();
  const { record } = useHistory();
  const verdict = useMemo(
    () => (facts ? evaluate(effectiveFacts(facts, experience), answersFor(experience, answers)) : undefined),
    [facts, answers, experience],
  );
  const est = verdict?.estimate;
  const amount = !est ? 0 : verdict?.outcome === 'possible' && !est.reduced ? est.fullAmount.amount : est.perPassenger.amount;
  const shown = useCountUp(verdict && (verdict.outcome === 'likely' || verdict.outcome === 'possible') ? amount : 0);

  // Remember this check so it can be reopened from the Check tab.
  useEffect(() => {
    if (!facts || !verdict) return;
    const e = verdict.estimate;
    const money = e && (verdict.outcome === 'likely' || verdict.outcome === 'possible') ? formatMoney(verdict.outcome === 'possible' && !e.reduced ? e.fullAmount : e.perPassenger) : undefined;
    record({ facts, source: source ?? 'live', answers, experience, passenger, outcome: verdict.outcome, amountText: money });
  }, [facts, verdict, source, answers, experience, passenger, record]);

  useEffect(() => {
    if (verdict?.outcome === 'likely') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [verdict?.outcome]);

  if (!facts || !verdict) return <Redirect href="/" />;

  const plain = PLAIN[verdict.outcome];
  const hasMoney = Boolean(est) && (verdict.outcome === 'likely' || verdict.outcome === 'possible');
  const currency = est?.perPassenger.currency ?? 'EUR';
  const eligibleForKit = verdict.outcome === 'likely' || verdict.outcome === 'possible' || verdict.outcome === 'refund_only';
  const route = `${facts.origin.iata}→${facts.destination.iata}`;
  const unlocked = isUnlocked(flightKey(facts));
  const kitPrice = plans.find((p) => p.kind === 'kit')?.priceString;
  const annualPrice = plans.find((p) => p.kind === 'annual')?.priceString;
  const fee = Math.round(amount * AGENCY_CUT);
  const checks = verdict.steps.filter((x) => x.status !== 'info').length;
  const law = LAW[verdict.regime] ?? verdict.regime;
  const tag = VERDICT_TAG[verdict.outcome];

  const footer = eligibleForKit ? (
    <>
      <Button
        title={unlocked ? 'Open my Claim Kit' : verdict.outcome === 'refund_only' ? 'Get my refund request' : 'Get my Claim Kit'}
        variant="gold"
        icon={unlocked ? 'document-text' : 'download-outline'}
        trailing={unlocked ? undefined : kitPrice}
        iconRight="arrow-forward"
        onPress={() => router.push(unlocked ? '/kit' : '/paywall')}
      />
      {!unlocked && !pro && annualPrice ? (
        <Button title={`Or every flight for ${annualPrice}/yr`} variant="subtle" icon="infinite" onPress={() => router.push('/paywall')} />
      ) : null}
    </>
  ) : (
    <Button
      title="Check another flight"
      variant="ghost"
      onPress={() => {
        reset();
        router.dismissAll();
      }}
    />
  );

  const header = (
    <View>
      <BackBar
        onBack={() => router.back()}
        title="Your verdict"
        right={<HeaderButton icon="share-outline" label="Share result" onPress={() => Share.share({ message: shareText(verdict, facts.flightNumber, route) }).catch(() => {})} />}
      />
      <Text style={styles.headerSub}>
        {facts.flightNumber} · {facts.origin.city} → {facts.destination.city}
      </Text>
      <View style={{ alignItems: 'center', marginTop: S.lg }}>
        <Tag text={tag.text} tone={tag.tone} icon="shield-checkmark" style={{ alignSelf: 'center' }} />
      </View>
    </View>
  );

  return (
    <Screen footer={footer} header={header} overlap={64}>
      {/* Hero */}
      <Animated.View entering={FadeInUp.duration(500)}>
        {hasMoney ? (
          <View style={styles.goldHero}>
            <Ionicons name="cash" size={170} color="rgba(9,37,112,0.06)" style={styles.heroWatermark} />
            <Tag text={`${verdict.claimAgainst.name} ${verdict.outcome === 'likely' ? 'owes you' : 'may owe you'}`} tone="white" icon="airplane" style={{ alignSelf: 'center' }} />
            <Text style={styles.amount} adjustsFontSizeToFit numberOfLines={1}>
              {verdict.outcome === 'possible' ? <Text style={styles.upTo}>up to </Text> : null}
              {formatMoney({ amount: shown, currency })}
            </Text>
            <Text style={styles.perPax}>
              per passenger under <Text style={{ fontFamily: F.black }}>{law}</Text>
              {est?.reduced ? ` · reduced from ${formatMoney(est.fullAmount)}` : ''}
            </Text>
            <View style={styles.heroPills}>
              {verdict.delayMinutes !== undefined && verdict.delayMinutes > 0 ? (
                <Tag text={`${formatDuration(verdict.delayMinutes)} late`} tone="white" icon="time-outline" />
              ) : null}
              <Tag text="Claim direct, keep it all" tone="white" icon="flash" />
            </View>
          </View>
        ) : (
          <View style={styles.plainHero}>
            <IconBadge name={plain.icon} color={plain.color} bg={plain.bg} size={26} />
            <Text style={[T.label, { color: plain.color, marginTop: S.lg }]}>{plain.label}</Text>
            <Text style={styles.headline}>{verdict.headline}</Text>
            {verdict.regime !== 'NONE' ? <Text style={styles.plainSub}>Checked against {law}</Text> : null}
          </View>
        )}
      </Animated.View>

      {/* Breakdown */}
      {hasMoney && est ? (
        <Animated.View entering={FadeInDown.delay(150).duration(450)} style={styles.card}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>The breakdown</Text>
              <Text style={styles.cardTitle}>Keep 100% of your cash</Text>
            </View>
            <IconBadge name="wallet-outline" />
          </View>
          <Text style={styles.cardBody}>
            Claim companies usually take about <Text style={{ fontFamily: F.black, color: C.text }}>35%</Text> of what you’re paid. Claim it yourself with
            ready-made letters instead.
          </Text>
          <View style={[styles.cmpRow, styles.cmpWin]}>
            <View style={[styles.cmpIcon, { backgroundColor: C.blue }]}>
              <Ionicons name="checkmark" size={16} color={C.onBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cmpTitle}>RefundDrop Claim Kit</Text>
              <Text style={styles.cmpSub}>{kitPrice ? `One-time ${kitPrice}` : 'One-time price'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.cmpAmount, { color: C.blue }]}>{formatMoney({ amount, currency })}</Text>
              <Text style={styles.cmpNote}>You keep 100%</Text>
            </View>
          </View>
          <View style={styles.cmpRow}>
            <View style={[styles.cmpIcon, { backgroundColor: C.surfaceHi }]}>
              <Ionicons name="close" size={16} color={C.muted} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cmpTitle}>Claim companies</Text>
              <Text style={[styles.cmpSub, { color: C.bad }]}>~35% commission</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.cmpAmount, { color: C.faint, textDecorationLine: 'line-through' }]}>{formatMoney({ amount: amount - fee, currency })}</Text>
              <Text style={[styles.cmpNote, { color: C.bad }]}>−{formatMoney({ amount: fee, currency })} fee</Text>
            </View>
          </View>
          <View style={styles.extra}>
            <Ionicons name="cash-outline" size={18} color={C.text} />
            <Text style={styles.extraText}>
              You keep <Text style={{ fontFamily: F.black }}>+{formatMoney({ amount: fee, currency })} extra</Text> in your own pocket
            </Text>
          </View>
        </Animated.View>
      ) : null}

      {/* Case file */}
      <Animated.View entering={FadeInDown.delay(220).duration(450)} style={styles.card}>
        <View style={styles.cardHead}>
          <IconBadge name="document-text-outline" />
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Case file</Text>
            <Text style={styles.cardTitle}>How we decided</Text>
          </View>
          <Tag text={`${checks} checks`} tone="grey" />
        </View>
        <View style={styles.routeBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.routeLabel}>Route</Text>
            <Text style={styles.routeValue}>
              {facts.origin.iata} <Ionicons name="arrow-forward" size={14} color={C.blue} /> {facts.destination.iata}
            </Text>
            <Text style={styles.routeSub} numberOfLines={1}>
              {facts.origin.city} to {facts.destination.city}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.routeLabel}>Flight</Text>
            <Text style={styles.routeValue}>{facts.flightNumber}</Text>
            <Text style={styles.routeSub} numberOfLines={1}>
              {facts.operatingCarrier.name}
            </Text>
          </View>
        </View>
        {verdict.steps.map((step, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.rail}>
              <Ionicons name={STEP_ICON[step.status].name} size={step.status === 'info' ? 10 : 20} color={STEP_ICON[step.status].color} />
              {i < verdict.steps.length - 1 ? <View style={styles.railLine} /> : null}
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepDetail}>{step.detail}</Text>
              {step.ruleRef ? (
                <View style={styles.ruleChip}>
                  <Ionicons name="book-outline" size={11} color={C.info} />
                  <Text style={styles.ruleRef}>{step.ruleRef}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </Animated.View>

      {verdict.openQuestions.length ? (
        <View style={[styles.card, { backgroundColor: C.infoSoft }]}>
          <Text style={[styles.kicker, { marginBottom: S.sm }]}>Still to confirm</Text>
          {verdict.openQuestions.map((q) => (
            <View key={q} style={styles.bulletRow}>
              <Ionicons name="help-circle-outline" size={16} color={C.info} />
              <Text style={styles.bulletText}>{q}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Kit */}
      {eligibleForKit ? (
        <Animated.View entering={FadeInDown.delay(280).duration(450)} style={styles.card}>
          <View style={styles.cardHead}>
            <IconBadge name="archive-outline" color={C.text} bg={C.goldSoft} />
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>Ready to file</Text>
              <Text style={styles.cardTitle}>Your 3-step Claim Kit</Text>
            </View>
          </View>
          {[
            {
              t: verdict.outcome === 'refund_only' ? 'Refund request letter' : 'Claim letter',
              d: `Addressed to ${facts.operatingCarrier.name} with your flight details and the exact law that applies.`,
            },
            { t: 'Day-14 follow-up', d: 'A reminder on your phone and a firmer letter if the airline hasn’t replied.' },
            { t: 'Free escalation', d: `A ready complaint for ${enforcementBody(verdict, facts)} if they still refuse.` },
          ].map((k, i) => (
            <View key={k.t} style={styles.kitRow}>
              <View style={styles.kitNum}>
                <Text style={styles.kitNumText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.kitTitle}>{k.t}</Text>
                <Text style={styles.kitBody}>{k.d}</Text>
              </View>
            </View>
          ))}
        </Animated.View>
      ) : null}

      <View style={styles.card}>
        <Text style={[styles.kicker, { marginBottom: S.sm }]}>Also owed to you</Text>
        {verdict.otherRights.map((r) => (
          <View key={r} style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={16} color={C.good} />
            <Text style={styles.bulletText}>{r}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.disclaimer}>
        {verdict.disclaimer}
        {'\n'}Rules: {verdict.rulesVersion}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerSub: { color: C.onBlueMuted, fontFamily: F.semibold, fontSize: 14, marginTop: S.xs, marginLeft: 54 },
  goldHero: { backgroundColor: C.gold, borderRadius: R.xl, padding: S.xl, alignItems: 'center', overflow: 'hidden', ...GOLD_GLOW },
  heroWatermark: { position: 'absolute', right: -30, bottom: -30, transform: [{ rotate: '-18deg' }] },
  amount: { fontFamily: F.display, color: C.text, fontSize: 60, letterSpacing: -2, marginTop: S.md, lineHeight: 68 },
  upTo: { fontFamily: F.bold, fontSize: 24, letterSpacing: 0 },
  perPax: { ...T.small, color: '#3B3200', textAlign: 'center' },
  heroPills: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: S.sm, marginTop: S.lg },
  plainHero: { backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl, ...SHADOW },
  headline: { ...T.h1, color: C.text, fontSize: 24, lineHeight: 30, marginTop: S.xs },
  plainSub: { ...T.small, color: C.muted, marginTop: S.sm },
  card: { backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl, marginTop: S.lg, ...SHADOW },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: S.md },
  kicker: { ...T.label, color: C.blue, fontSize: 10.5 },
  cardTitle: { color: C.text, fontFamily: F.display, fontSize: 20, letterSpacing: -0.5, marginTop: 2 },
  cardBody: { ...T.body, color: C.muted, marginTop: S.md, marginBottom: S.md },
  cmpRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.bg, borderRadius: R.lg, padding: S.lg, marginTop: S.sm },
  cmpWin: { backgroundColor: C.accentSoft, borderWidth: 1.5, borderColor: 'rgba(19,81,231,0.2)' },
  cmpIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cmpTitle: { color: C.text, fontFamily: F.black, fontSize: 15 },
  cmpSub: { color: C.muted, fontFamily: F.semibold, fontSize: 12, marginTop: 1 },
  cmpAmount: { fontFamily: F.display, fontSize: 20, letterSpacing: -0.5 },
  cmpNote: { color: C.muted, fontFamily: F.bold, fontSize: 11, marginTop: 1 },
  extra: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.goldSoft, borderRadius: R.md, padding: S.md, marginTop: S.md },
  extraText: { flex: 1, color: C.text, fontFamily: F.semibold, fontSize: 13 },
  routeBox: { flexDirection: 'row', gap: S.lg, backgroundColor: C.bg, borderRadius: R.md, padding: S.lg, marginTop: S.lg, marginBottom: S.lg },
  routeLabel: { color: C.muted, fontFamily: F.semibold, fontSize: 12 },
  routeValue: { color: C.text, fontFamily: F.black, fontSize: 17, marginTop: 2 },
  routeSub: { color: C.muted, fontFamily: F.medium, fontSize: 12 },
  step: { flexDirection: 'row', gap: S.md },
  rail: { width: 22, alignItems: 'center', paddingTop: 2 },
  railLine: { flex: 1, width: 2, backgroundColor: C.line, marginTop: 4, marginBottom: -2, borderRadius: 1 },
  stepBody: { flex: 1, paddingBottom: S.lg },
  stepLabel: { color: C.text, fontSize: 15, fontFamily: F.black },
  stepDetail: { ...T.small, color: C.muted, marginTop: 3 },
  ruleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: C.infoSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
  ruleRef: { color: C.info, fontSize: 11, fontFamily: F.bold },
  kitRow: { flexDirection: 'row', gap: S.md, backgroundColor: C.bg, borderRadius: R.md, padding: S.lg, marginTop: S.md },
  kitNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  kitNumText: { color: C.onBlue, fontFamily: F.black, fontSize: 13 },
  kitTitle: { color: C.text, fontFamily: F.black, fontSize: 15 },
  kitBody: { ...T.small, color: C.muted, marginTop: 2 },
  bulletRow: { flexDirection: 'row', gap: S.sm, alignItems: 'flex-start', marginTop: S.xs },
  bulletText: { ...T.small, color: C.text, flex: 1 },
  disclaimer: { color: C.faint, fontSize: 11, lineHeight: 16, marginTop: S.xl, fontFamily: F.body },
});
