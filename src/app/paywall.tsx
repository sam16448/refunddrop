import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { BackBar, Button, Screen } from '@/components/ui';
import { answersFor, effectiveFacts } from '@/lib/claim';
import { evaluate, formatMoney } from '@/rules';
import { isClaimKitPackage } from '@/services/purchases';
import { useClaim } from '@/state/claim';
import { flightKey, useEntitlements } from '@/state/entitlements';
import { C, R, S, T } from '@/theme';

/** Typical claim-company success fee used for the comparison (AirHelp's published standard fee). */
const CLAIM_COMPANY_FEE = 0.35;

const INCLUDED = [
  'Claim letter citing the exact rules for your flight',
  'Day-14 follow-up and regulator escalation letters',
  'Copy, share or save as PDF',
  'Claim tracker with follow-up reminders',
];

function PlanCard({
  pkg,
  selected,
  onPress,
  title,
  sub,
  badge,
}: {
  pkg: PurchasesPackage;
  selected: boolean;
  onPress: () => void;
  title: string;
  sub: string;
  badge?: string;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.plan, selected && styles.planSelected]} accessibilityRole="radio" accessibilityState={{ selected }}>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? C.accent : C.muted} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Text style={styles.planTitle}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        <Text style={styles.planSub}>{sub}</Text>
      </View>
      <Text style={styles.planPrice}>{pkg.product.priceString}</Text>
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
  const fee = est ? formatMoney({ amount: Math.round(est.perPassenger.amount * CLAIM_COMPANY_FEE), currency: est.perPassenger.currency }) : undefined;

  const kit = ent.packages.find(isClaimKitPackage);
  const annual = ent.packages.find((p) => !isClaimKitPackage(p));
  const selected = ent.packages.find((p) => p.identifier === selectedId) ?? kit ?? annual;

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
    Alert.alert(ok ? 'Purchases restored' : 'Nothing to restore', ok ? 'Any Claim Kits or subscription you bought are available again.' : undefined);
  };

  return (
    <Screen
      footer={
        ent.credits > 0 ? (
          <Button title={`Use 1 of ${ent.credits} Claim Kit credit${ent.credits > 1 ? 's' : ''}`} icon="ticket" onPress={useCredit} />
        ) : (
          <Button
            title={selected ? `Unlock for ${selected.product.priceString}` : 'Unlock Claim Kit'}
            icon="lock-open"
            onPress={onBuy}
            loading={busy}
            disabled={!selected}
          />
        )
      }
    >
      <BackBar onBack={() => router.back()} title="Claim Kit" />

      <Text style={styles.title}>Keep all of it.</Text>
      {est && fee ? (
        <View style={styles.compare}>
          <View style={styles.compareCol}>
            <Text style={styles.compareLabel}>Claim company</Text>
            <Text style={[styles.compareValue, { color: C.bad }]}>−{fee}</Text>
            <Text style={styles.compareSub}>~35% success fee</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.compareCol}>
            <Text style={styles.compareLabel}>RefundDrop</Text>
            <Text style={[styles.compareValue, { color: C.good }]}>{kit?.product.priceString ?? '$4.99'}</Text>
            <Text style={styles.compareSub}>You keep {formatMoney(est.perPassenger)}</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.sub}>A ready-to-send request that cites the rules, so the airline can’t fob you off with a voucher.</Text>
      )}

      <View style={{ marginTop: S.xl }}>
        {INCLUDED.map((t) => (
          <View key={t} style={styles.incl}>
            <Ionicons name="checkmark" size={18} color={C.good} />
            <Text style={styles.inclText}>{t}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: S.xl, gap: S.sm }}>
        {!ent.ready ? (
          <ActivityIndicator color={C.accent} />
        ) : ent.packages.length === 0 ? (
          <Text style={styles.sub}>Plans are unavailable right now. Check your connection and try again.</Text>
        ) : (
          <>
            {kit ? (
              <PlanCard
                pkg={kit}
                selected={selected?.identifier === kit.identifier}
                onPress={() => setSelectedId(kit.identifier)}
                title="This claim"
                sub="One-time purchase for this flight"
              />
            ) : null}
            {annual ? (
              <PlanCard
                pkg={annual}
                selected={selected?.identifier === annual.identifier}
                onPress={() => setSelectedId(annual.identifier)}
                title="Frequent Flyer"
                sub="Unlimited claims for a year"
                badge="BEST FOR 4+ TRIPS"
              />
            ) : null}
          </>
        )}
      </View>

      <Pressable onPress={onRestore} hitSlop={8} style={{ alignSelf: 'center', marginTop: S.lg }}>
        <Text style={styles.restore}>Restore purchases</Text>
      </Pressable>
      <Text style={styles.fine}>
        The eligibility check is always free. RefundDrop provides information and letter templates, not legal advice or
        representation. The annual plan renews unless cancelled in your store settings.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...T.h1, color: C.text, fontSize: 32 },
  sub: { ...T.body, color: C.muted, marginTop: S.sm },
  compare: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, marginTop: S.lg },
  compareCol: { flex: 1, alignItems: 'center' },
  compareLabel: { ...T.label, color: C.muted, fontSize: 11 },
  compareValue: { fontSize: 28, fontWeight: '900', marginTop: 6 },
  compareSub: { color: C.muted, fontSize: 12, marginTop: 2 },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: C.line, marginHorizontal: S.md },
  incl: { flexDirection: 'row', gap: S.sm, alignItems: 'center', marginBottom: S.sm },
  inclText: { color: C.text, fontSize: 15 },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.lg,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  planSelected: { borderColor: C.accent },
  planTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
  planSub: { color: C.muted, fontSize: 13, marginTop: 2 },
  planPrice: { color: C.text, fontSize: 18, fontWeight: '800' },
  badge: { color: C.accentInk, backgroundColor: C.accent, fontSize: 10, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  restore: { color: C.info, fontWeight: '700' },
  fine: { color: C.faint, fontSize: 11, lineHeight: 16, marginTop: S.lg, textAlign: 'center' },
});
