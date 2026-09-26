/**
 * Day-1 preview screen: runs the four sample flights through the rules engine
 * so the logic can be checked on a phone. The full five-screen flow
 * (scan → flight card → questions → verdict → claim kit) replaces this on Day 2.
 */
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SAMPLE_FLIGHTS } from './src/data/sampleFlights';
import { evaluate, formatDuration } from './src/rules';
import type { StepStatus, Verdict } from './src/rules';

const COLORS = {
  bg: '#0B1220',
  card: '#131C2E',
  line: '#22304A',
  text: '#F4F6FB',
  muted: '#93A1BA',
  accent: '#FFB020',
  good: '#35D07F',
  bad: '#FF6B6B',
  unknown: '#8AB4FF',
};

const STATUS_COLOR: Record<StepStatus, string> = {
  pass: COLORS.good,
  fail: COLORS.bad,
  unknown: COLORS.unknown,
  info: COLORS.muted,
};

const STATUS_MARK: Record<StepStatus, string> = { pass: '✓', fail: '✕', unknown: '?', info: '•' };

export default function App() {
  const [selected, setSelected] = useState(SAMPLE_FLIGHTS[0].id);
  const sample = SAMPLE_FLIGHTS.find((s) => s.id === selected)!;
  const verdict: Verdict = evaluate(sample.facts, sample.demoAnswers);

  return (
    <View style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>RefundDrop</Text>
        <Text style={styles.tagline}>Claim what airlines owe you — and keep all of it.</Text>

        <Text style={styles.section}>Sample flights</Text>
        {SAMPLE_FLIGHTS.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => setSelected(s.id)}
            style={[styles.chip, s.id === selected && styles.chipActive]}
          >
            <Text style={styles.chipTitle}>
              {s.facts.flightNumber} · {s.title}
            </Text>
            <Text style={styles.chipSub}>{s.subtitle}</Text>
          </Pressable>
        ))}

        <View style={styles.card}>
          <Text style={styles.route}>
            {sample.facts.origin.iata} → {sample.facts.destination.iata}
          </Text>
          <Text style={styles.meta}>
            {sample.facts.operatingCarrier.name} · {sample.facts.date}
            {verdict.delayMinutes !== undefined && verdict.delayMinutes > 0
              ? ` · ${formatDuration(verdict.delayMinutes)} late`
              : sample.facts.status === 'cancelled'
                ? ' · Cancelled'
                : ''}
          </Text>
          <Text
            style={[
              styles.headline,
              { color: verdict.outcome === 'likely' || verdict.outcome === 'refund_only' ? COLORS.accent : COLORS.text },
            ]}
          >
            {verdict.headline}
          </Text>
          <Text style={styles.regime}>{verdict.regime === 'NONE' ? 'No supported regime' : verdict.regime}</Text>
        </View>

        <Text style={styles.section}>Why</Text>
        {verdict.steps.map((step, i) => (
          <View key={i} style={styles.step}>
            <Text style={[styles.mark, { color: STATUS_COLOR[step.status] }]}>{STATUS_MARK[step.status]}</Text>
            <View style={styles.stepBody}>
              <Text style={styles.stepLabel}>{step.label}</Text>
              <Text style={styles.stepDetail}>{step.detail}</Text>
              {step.ruleRef ? <Text style={styles.ruleRef}>{step.ruleRef}</Text> : null}
            </View>
          </View>
        ))}

        <Text style={styles.disclaimer}>Sample data for illustration. {verdict.disclaimer}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingTop: 48, paddingBottom: 64 },
  brand: { color: COLORS.accent, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { color: COLORS.muted, fontSize: 15, marginTop: 4, marginBottom: 20 },
  section: { color: COLORS.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 20, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: COLORS.line, borderRadius: 12, padding: 12, marginBottom: 8 },
  chipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.card },
  chipTitle: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  chipSub: { color: COLORS.muted, fontSize: 13, marginTop: 2 },
  card: { backgroundColor: COLORS.card, borderRadius: 16, padding: 20, marginTop: 16 },
  route: { color: COLORS.text, fontSize: 34, fontWeight: '800', letterSpacing: 1 },
  meta: { color: COLORS.muted, fontSize: 14, marginTop: 4 },
  headline: { fontSize: 22, fontWeight: '700', marginTop: 16, lineHeight: 28 },
  regime: { color: COLORS.muted, fontSize: 12, marginTop: 6 },
  step: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.line },
  mark: { width: 22, fontSize: 16, fontWeight: '800' },
  stepBody: { flex: 1 },
  stepLabel: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  stepDetail: { color: COLORS.muted, fontSize: 13, marginTop: 3, lineHeight: 18 },
  ruleRef: { color: COLORS.unknown, fontSize: 11, marginTop: 4 },
  disclaimer: { color: COLORS.muted, fontSize: 11, marginTop: 24, lineHeight: 16 },
});
