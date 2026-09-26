import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BackBar, Button, Card, Pill, Screen, SectionLabel } from '@/components/ui';
import { answersFor, effectiveFacts } from '@/lib/claim';
import { evaluate, formatDuration, formatMoney, type Outcome, type StepStatus } from '@/rules';
import { useClaim } from '@/state/claim';
import { C, R, S, T } from '@/theme';

const OUTCOME_STYLE: Record<Outcome, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  likely: { color: C.accent, label: 'Likely eligible', icon: 'checkmark-circle' },
  possible: { color: C.info, label: 'Possibly eligible', icon: 'help-circle' },
  refund_only: { color: C.good, label: 'Refund, not compensation', icon: 'cash-outline' },
  not_eligible: { color: C.muted, label: 'Not eligible', icon: 'close-circle' },
  not_covered: { color: C.muted, label: 'Not covered', icon: 'remove-circle' },
};

const STEP_ICON: Record<StepStatus, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  pass: { name: 'checkmark-circle', color: C.good },
  fail: { name: 'close-circle', color: C.bad },
  unknown: { name: 'help-circle', color: C.info },
  info: { name: 'information-circle', color: C.muted },
};

/** Counts up from 0 to `target` over ~0.9s. */
function useCountUp(target: number): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target <= 0) return setValue(0);
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / 900);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t === 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target]);
  return value;
}

export default function VerdictScreen() {
  const { facts, answers, experience, reset } = useClaim();
  const verdict = useMemo(
    () => (facts ? evaluate(effectiveFacts(facts, experience), answersFor(experience, answers)) : undefined),
    [facts, answers, experience],
  );
  const est = verdict?.estimate;
  const amount = !est ? 0 : verdict?.outcome === 'possible' && !est.reduced ? est.fullAmount.amount : est.perPassenger.amount;
  const shown = useCountUp(verdict && (verdict.outcome === 'likely' || verdict.outcome === 'possible') ? amount : 0);

  useEffect(() => {
    if (verdict?.outcome === 'likely') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [verdict?.outcome]);

  if (!facts || !verdict) return <Redirect href="/" />;

  const style = OUTCOME_STYLE[verdict.outcome];
  const hasMoney = verdict.estimate && (verdict.outcome === 'likely' || verdict.outcome === 'possible');
  const currency = verdict.estimate?.perPassenger.currency ?? 'EUR';
  const eligibleForKit = verdict.outcome === 'likely' || verdict.outcome === 'possible' || verdict.outcome === 'refund_only';

  const footer = eligibleForKit ? (
    <Button
      title="Get my Claim Kit"
      icon="document-text"
      onPress={() => router.push('/kit')}
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
      <BackBar onBack={() => router.back()} title={`${facts.flightNumber} · ${facts.origin.iata} → ${facts.destination.iata}`} />

      <Card style={{ borderWidth: 1, borderColor: style.color }}>
        <View style={styles.outcomeRow}>
          <Ionicons name={style.icon} size={22} color={style.color} />
          <Text style={[styles.outcomeLabel, { color: style.color }]}>{style.label}</Text>
        </View>

        {hasMoney ? (
          <>
            <Text style={[styles.amount, { color: style.color }]}>
              {verdict.outcome === 'possible' ? 'up to ' : ''}
              {formatMoney({ amount: shown, currency })}
            </Text>
            <Text style={styles.perPax}>
              per passenger{verdict.estimate?.reduced ? ` · reduced from ${formatMoney(verdict.estimate.fullAmount)}` : ''}
            </Text>
          </>
        ) : (
          <Text style={styles.headline}>{verdict.headline}</Text>
        )}

        <View style={styles.pills}>
          {verdict.regime !== 'NONE' ? <Pill text={verdict.regime.replace('_', ' ')} color={C.muted} /> : null}
          {verdict.delayMinutes !== undefined && verdict.delayMinutes > 0 ? (
            <Pill text={`${formatDuration(verdict.delayMinutes)} late`} color={C.muted} />
          ) : null}
          <Pill text={`Claim from ${verdict.claimAgainst.name}`} color={C.muted} />
        </View>
      </Card>

      {hasMoney && verdict.outcome === 'likely' ? (
        <Text style={styles.keep}>
          Claim companies typically keep 25–35% of this. With RefundDrop you file it yourself and keep all of it.
        </Text>
      ) : null}

      <SectionLabel>Why</SectionLabel>
      {verdict.steps.map((step, i) => (
        <View key={i} style={styles.step}>
          <Ionicons name={STEP_ICON[step.status].name} size={20} color={STEP_ICON[step.status].color} style={{ marginTop: 1 }} />
          <View style={styles.stepBody}>
            <Text style={styles.stepLabel}>{step.label}</Text>
            <Text style={styles.stepDetail}>{step.detail}</Text>
            {step.ruleRef ? <Text style={styles.ruleRef}>{step.ruleRef}</Text> : null}
          </View>
        </View>
      ))}

      {verdict.openQuestions.length ? (
        <>
          <SectionLabel>Still to confirm</SectionLabel>
          {verdict.openQuestions.map((q) => (
            <Text key={q} style={styles.bullet}>
              • {q}
            </Text>
          ))}
        </>
      ) : null}

      <SectionLabel>Also owed to you</SectionLabel>
      {verdict.otherRights.map((r) => (
        <Text key={r} style={styles.bullet}>
          • {r}
        </Text>
      ))}

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>{verdict.disclaimer}</Text>
        <Text style={[styles.disclaimerText, { marginTop: 4 }]}>Rules: {verdict.rulesVersion}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  outcomeRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm },
  outcomeLabel: { fontSize: 16, fontWeight: '800' },
  amount: { fontSize: 56, fontWeight: '900', letterSpacing: -1.5, marginTop: S.md },
  perPax: { color: C.muted, fontSize: 14 },
  headline: { ...T.h2, color: C.text, marginTop: S.md, lineHeight: 26 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginTop: S.lg },
  keep: { ...T.small, color: C.text, marginTop: S.lg, backgroundColor: C.surfaceHi, padding: S.md, borderRadius: R.md, overflow: 'hidden' },
  step: { flexDirection: 'row', gap: S.md, paddingVertical: S.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  stepBody: { flex: 1 },
  stepLabel: { color: C.text, fontSize: 15, fontWeight: '700' },
  stepDetail: { ...T.small, color: C.muted, marginTop: 3 },
  ruleRef: { color: C.info, fontSize: 11, marginTop: 4 },
  bullet: { ...T.small, color: C.text, marginBottom: S.sm },
  disclaimer: { marginTop: S.xl, padding: S.md, borderRadius: R.md, borderWidth: 1, borderColor: C.line },
  disclaimerText: { color: C.faint, fontSize: 11, lineHeight: 16 },
});
