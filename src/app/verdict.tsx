import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { BackBar, Button, Pill, Screen, SectionLabel } from '@/components/ui';
import { answersFor, effectiveFacts } from '@/lib/claim';
import { evaluate, formatDuration, formatMoney, type Outcome, type StepStatus, type Verdict } from '@/rules';
import { useClaim } from '@/state/claim';
import { flightKey, useEntitlements } from '@/state/entitlements';
import { useHistory } from '@/state/history';
import { C, F, R, S, T } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const OUTCOME_STYLE: Record<Outcome, { color: string; soft: string; label: string; icon: IconName; gradient: [string, string] }> = {
  likely: { color: C.accent, soft: C.accentSoft, label: 'Likely eligible', icon: 'checkmark-circle', gradient: ['#3A2A08', '#141B2C'] },
  possible: { color: C.info, soft: C.infoSoft, label: 'Possibly eligible', icon: 'help-circle', gradient: ['#15294A', '#141B2C'] },
  refund_only: { color: C.good, soft: C.goodSoft, label: 'Refund, not compensation', icon: 'cash-outline', gradient: ['#0F3326', '#141B2C'] },
  not_eligible: { color: C.muted, soft: C.surfaceHi, label: 'Not eligible', icon: 'close-circle', gradient: ['#1C2436', '#141B2C'] },
  not_covered: { color: C.muted, soft: C.surfaceHi, label: 'Not covered', icon: 'remove-circle', gradient: ['#1C2436', '#141B2C'] },
};

const STEP_ICON: Record<StepStatus, { name: IconName; color: string }> = {
  pass: { name: 'checkmark-circle', color: C.good },
  fail: { name: 'close-circle', color: C.bad },
  unknown: { name: 'help-circle', color: C.info },
  info: { name: 'ellipse', color: C.faint },
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
  const { isUnlocked } = useEntitlements();
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

  const style = OUTCOME_STYLE[verdict.outcome];
  const hasMoney = Boolean(est) && (verdict.outcome === 'likely' || verdict.outcome === 'possible');
  const currency = est?.perPassenger.currency ?? 'EUR';
  const eligibleForKit = verdict.outcome === 'likely' || verdict.outcome === 'possible' || verdict.outcome === 'refund_only';
  const route = `${facts.origin.iata}→${facts.destination.iata}`;

  const footer = eligibleForKit ? (
    <Button
      title={verdict.outcome === 'refund_only' ? 'Get my refund request' : 'Get my Claim Kit'}
      icon="document-text"
      onPress={() => router.push(isUnlocked(flightKey(facts)) ? '/kit' : '/paywall')}
    />
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

  return (
    <Screen footer={footer}>
      <BackBar
        onBack={() => router.back()}
        title={`${facts.flightNumber} · ${facts.origin.iata} → ${facts.destination.iata}`}
        right={
          <Pressable
            accessibilityLabel="Share result"
            hitSlop={10}
            onPress={() => Share.share({ message: shareText(verdict, facts.flightNumber, route) }).catch(() => {})}
            style={styles.shareButton}
          >
            <Ionicons name="share-outline" size={18} color={C.text} />
          </Pressable>
        }
      />

      <Animated.View entering={FadeInUp.duration(500)}>
        <LinearGradient colors={style.gradient} start={{ x: 0, y: 0 }} end={{ x: 0.8, y: 1 }} style={[styles.hero, { borderColor: style.color }]}>
          <View style={[styles.badge, { backgroundColor: style.soft }]}>
            <Ionicons name={style.icon} size={16} color={style.color} />
            <Text style={[styles.badgeText, { color: style.color }]}>{style.label}</Text>
          </View>

          {hasMoney ? (
            <>
              <Text style={[styles.amount, { color: style.color }]}>
                {verdict.outcome === 'possible' ? <Text style={styles.upTo}>up to </Text> : null}
                {formatMoney({ amount: shown, currency })}
              </Text>
              <Text style={styles.perPax}>
                per passenger{est?.reduced ? ` · reduced from ${formatMoney(est.fullAmount)}` : ''}
              </Text>
            </>
          ) : (
            <Text style={styles.headline}>{verdict.headline}</Text>
          )}

          <View style={styles.pills}>
            {verdict.regime !== 'NONE' ? <Pill text={verdict.regime.replace('_', ' ')} color={C.text} icon="document-outline" /> : null}
            {verdict.delayMinutes !== undefined && verdict.delayMinutes > 0 ? (
              <Pill text={`${formatDuration(verdict.delayMinutes)} late`} color={C.text} icon="time-outline" />
            ) : null}
            <Pill text={verdict.claimAgainst.name} color={C.text} icon="airplane-outline" />
          </View>
        </LinearGradient>
      </Animated.View>

      {hasMoney && verdict.outcome === 'likely' && est ? (
        <Animated.View entering={FadeInDown.delay(200).duration(450)} style={styles.keep}>
          <Ionicons name="wallet" size={18} color={C.good} />
          <Text style={styles.keepText}>
            A claim company would keep about{' '}
            <Text style={{ fontFamily: F.bold, color: C.text }}>
              {formatMoney({ amount: Math.round(est.perPassenger.amount * 0.35), currency })}
            </Text>
            . File it yourself and keep all of it.
          </Text>
        </Animated.View>
      ) : null}

      <SectionLabel right={<Text style={styles.stepCount}>{verdict.steps.filter((x) => x.status !== 'info').length} checks</Text>}>How we decided</SectionLabel>
      <View style={styles.stepsCard}>
        {verdict.steps.map((step, i) => (
          <Animated.View key={i} entering={FadeInDown.delay(250 + i * 70).duration(400)} style={styles.step}>
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
          </Animated.View>
        ))}
      </View>

      {verdict.openQuestions.length ? (
        <>
          <SectionLabel>Still to confirm</SectionLabel>
          <View style={[styles.box, { backgroundColor: C.infoSoft }]}>
            {verdict.openQuestions.map((q) => (
              <View key={q} style={styles.bulletRow}>
                <Ionicons name="help-circle-outline" size={16} color={C.info} />
                <Text style={styles.bulletText}>{q}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <SectionLabel>Also owed to you</SectionLabel>
      <View style={styles.box}>
        {verdict.otherRights.map((r) => (
          <View key={r} style={styles.bulletRow}>
            <Ionicons name="checkmark" size={16} color={C.good} />
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
  shareButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  hero: { borderRadius: R.xl, padding: S.xl, borderWidth: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontFamily: F.bold, fontSize: 13 },
  amount: { fontFamily: F.display, fontSize: 64, letterSpacing: -2, marginTop: S.md, lineHeight: 72 },
  upTo: { fontFamily: F.displayMedium, fontSize: 26, letterSpacing: 0 },
  perPax: { ...T.small, color: C.muted },
  headline: { ...T.h1, color: C.text, fontSize: 26, marginTop: S.md },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginTop: S.lg },
  keep: { flexDirection: 'row', gap: S.md, alignItems: 'center', marginTop: S.lg, backgroundColor: C.goodSoft, padding: S.lg, borderRadius: R.lg },
  keepText: { ...T.small, color: C.muted, flex: 1 },
  stepCount: { color: C.faint, fontFamily: F.semibold, fontSize: 12 },
  stepsCard: { backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, paddingBottom: S.xs, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  step: { flexDirection: 'row', gap: S.md },
  rail: { width: 22, alignItems: 'center', paddingTop: 2 },
  railLine: { flex: 1, width: 2, backgroundColor: C.line, marginTop: 4, marginBottom: -2, borderRadius: 1 },
  stepBody: { flex: 1, paddingBottom: S.lg },
  stepLabel: { color: C.text, fontSize: 15, fontFamily: F.bold },
  stepDetail: { ...T.small, color: C.muted, marginTop: 3 },
  ruleChip: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: C.infoSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  ruleRef: { color: C.info, fontSize: 11, fontFamily: F.semibold },
  box: { backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, gap: S.sm },
  bulletRow: { flexDirection: 'row', gap: S.sm, alignItems: 'flex-start' },
  bulletText: { ...T.small, color: C.text, flex: 1 },
  disclaimer: { color: C.faint, fontSize: 11, lineHeight: 16, marginTop: S.xl, fontFamily: F.body },
});
