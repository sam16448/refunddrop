import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BackBar, Button, Screen } from '@/components/ui';
import { answersFor, effectiveFacts } from '@/lib/claim';
import { evaluate, formatMoney } from '@/rules';
import { useClaim } from '@/state/claim';
import { flightKey, useEntitlements, type PlanOption } from '@/state/entitlements';
import { C, F, R, S, T } from '@/theme';

/** Typical claim-company success fee used for the comparison (AirHelp's published standard fee). */
const CLAIM_COMPANY_FEE = 0.35;

const INCLUDED: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'document-text-outline', text: 'Claim letter citing the exact rules for your flight' },
  { icon: 'repeat-outline', text: 'Day-14 follow-up and regulator escalation letters' },
  { icon: 'share-outline', text: 'Copy, share, PDF, or open the airline’s claim page' },
  { icon: 'notifications-outline', text: 'Claim tracker with follow-up reminders' },
];

function PlanCard({ plan, selected, onPress }: { plan: PlanOption; selected: boolean; onPress: () => void }) {
  const kit = plan.kind === 'kit';
  return (
    <Pressable
      onPress={onPress}
      style={[styles.plan, selected && styles.planSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? C.accent : C.faint} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Text style={styles.planTitle}>{kit ? 'This claim' : 'Frequent Flyer'}</Text>
          {!kit ? <Text style={styles.badge}>BEST FOR 4+ TRIPS</Text> : null}
        </View>
        <Text style={styles.planSub}>{kit ? 'One-time, for this flight' : 'Unlimited claims for a year'}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.planPrice}>{plan.priceString}</Text>
        <Text style={styles.planPer}>{kit ? 'once' : 'per year'}</Text>
      </View>
    </Pressable>
  );
}

export default function PaywallScreen() {
  const { facts, answers, experience } = useClaim();
  const ent = useEntitlements();
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(false);

  if (!facts) return <Redirect href="/" />;
  const key = flightKey(facts);
  if (ent.isUnlocked(key)) return <Redirect href="/kit" />;

  const verdict = evaluate(effectiveFacts(facts, experience), answersFor(experience, answers));
  const est = verdict.estimate;
  const fee = est
    ? formatMoney({ amount: Math.round(est.perPassenger.amount * CLAIM_COMPANY_FEE), currency: est.perPassenger.currency })
    : undefined;

  const kit = ent.plans.find((p) => p.kind === 'kit');
  const annual = ent.plans.find((p) => p.kind === 'annual');
  const selected = ent.plans.find((p) => p.id === selectedId) ?? kit ?? annual;

  const useCredit = () => {
    if (ent.unlock(key)) router.replace('/kit');
  };

  const onBuy = async () => {
    if (!selected) return;
    setBusy(true);
    const result = await ent.purchase(selected, key);
    setBusy(false);
    if (result === 'unlocked') router.replace('/kit');
    else if (result === 'error') Alert.alert('Purchase not completed', 'Nothing was charged. Please try again.');
  };

  const onRestore = async () => {
    setBusy(true);
    const ok = await ent.restorePurchases();
    setBusy(false);
    Alert.alert(
      ok ? 'Purchases restored' : 'Nothing to restore',
      ok ? 'Any Claim Kits or subscription you bought are available again.' : 'Restore works in the installed app with a store account.',
    );
  };

  return (
    <Screen
      footer={
        ent.credits > 0 ? (
          <Button title={`Use 1 of ${ent.credits} Claim Kit credit${ent.credits > 1 ? 's' : ''}`} icon="ticket" onPress={useCredit} />
        ) : (
          <Button
            title={selected ? `Unlock for ${selected.priceString}` : 'Unlock Claim Kit'}
            icon="lock-open"
            onPress={onBuy}
            loading={busy}
            disabled={!selected}
          />
        )
      }
    >
      <BackBar onBack={() => router.back()} title="Claim Kit" />

      <Animated.View entering={FadeInDown.duration(450)}>
        <Text style={styles.title}>Keep all of it.</Text>
        <Text style={styles.sub}>The check is free. Pay once for the part that gets you paid.</Text>
      </Animated.View>

      {est && fee ? (
        <Animated.View entering={FadeInDown.delay(100).duration(450)} style={styles.compare}>
          <View style={styles.compareCol}>
            <Text style={styles.compareLabel}>Claim company</Text>
            <Text style={[styles.compareValue, { color: C.bad }]}>−{fee}</Text>
            <Text style={styles.compareSub}>~35% success fee</Text>
          </View>
          <View style={styles.vs}>
            <Text style={styles.vsText}>vs</Text>
          </View>
          <LinearGradient colors={['rgba(52,211,153,0.16)', 'rgba(52,211,153,0.04)']} style={[styles.compareCol, styles.compareWin]}>
            <Text style={styles.compareLabel}>RefundDrop</Text>
            <Text style={[styles.compareValue, { color: C.good }]}>{kit?.priceString ?? '$4.99'}</Text>
            <Text style={styles.compareSub}>You keep {formatMoney(est.perPassenger)}</Text>
          </LinearGradient>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(180).duration(450)} style={{ marginTop: S.xl, gap: S.md }}>
        {INCLUDED.map((i) => (
          <View key={i.text} style={styles.incl}>
            <Ionicons name={i.icon} size={18} color={C.accent} />
            <Text style={styles.inclText}>{i.text}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(260).duration(450)} style={{ marginTop: S.xl, gap: S.sm }}>
        {!ent.ready ? (
          <ActivityIndicator color={C.accent} />
        ) : ent.plans.length === 0 ? (
          <Text style={styles.sub}>Plans are unavailable right now. Check your connection and try again.</Text>
        ) : (
          ent.plans.map((p) => (
            <PlanCard key={p.id} plan={p} selected={selected?.id === p.id} onPress={() => setSelectedId(p.id)} />
          ))
        )}
      </Animated.View>

      {ent.mode !== 'live' ? (
        <View style={styles.modeNote}>
          <Ionicons name="flask-outline" size={16} color={C.info} />
          <Text style={styles.modeText}>
            {ent.mode === 'preview'
              ? 'Expo Go preview: purchases unlock on this phone without charging. Real RevenueCat purchases run in the installed app.'
              : 'Demo mode: no RevenueCat key is configured, so unlocking is free.'}
          </Text>
        </View>
      ) : null}

      <Pressable onPress={onRestore} hitSlop={8} style={{ alignSelf: 'center', marginTop: S.lg }}>
        <Text style={styles.restore}>Restore purchases</Text>
      </Pressable>
      <Text style={styles.fine}>
        RefundDrop provides information and letter templates, not legal advice or representation. The annual plan renews
        unless cancelled in your store settings. See About for terms and privacy.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...T.h1, color: C.text, fontSize: 36, lineHeight: 42 },
  sub: { ...T.body, color: C.muted, marginTop: S.sm },
  compare: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: C.surface, borderRadius: R.lg, padding: S.sm, marginTop: S.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  compareCol: { flex: 1, alignItems: 'center', paddingVertical: S.lg, borderRadius: R.md },
  compareWin: { borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)' },
  compareLabel: { ...T.label, color: C.muted, fontSize: 10 },
  compareValue: { fontFamily: F.display, fontSize: 30, marginTop: 6 },
  compareSub: { ...T.small, color: C.muted, fontSize: 12, marginTop: 2 },
  vs: { justifyContent: 'center', paddingHorizontal: 6 },
  vsText: { fontFamily: F.bold, color: C.faint, fontSize: 12 },
  incl: { flexDirection: 'row', gap: S.md, alignItems: 'center' },
  inclText: { ...T.body, color: C.text, flex: 1 },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.lg,
    borderRadius: R.lg,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  planSelected: { borderColor: C.accent, backgroundColor: C.accentSoft },
  planTitle: { color: C.text, fontSize: 16, fontFamily: F.bold },
  planSub: { ...T.small, color: C.muted, marginTop: 2 },
  planPrice: { fontFamily: F.display, color: C.text, fontSize: 22 },
  planPer: { ...T.small, color: C.faint, fontSize: 11 },
  badge: { color: C.accentInk, backgroundColor: C.accent, fontSize: 9, fontFamily: F.black, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', letterSpacing: 0.5 },
  modeNote: { flexDirection: 'row', gap: S.sm, alignItems: 'flex-start', marginTop: S.lg, backgroundColor: C.infoSoft, padding: S.md, borderRadius: R.md },
  modeText: { ...T.small, color: C.info, flex: 1 },
  restore: { color: C.info, fontFamily: F.bold },
  fine: { color: C.faint, fontSize: 11, lineHeight: 16, marginTop: S.lg, textAlign: 'center', fontFamily: F.body },
});
