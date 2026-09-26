import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BackBar, Button, IconBadge, Screen, Tag } from '@/components/ui';
import { answersFor, effectiveFacts } from '@/lib/claim';
import { evaluate, formatMoney } from '@/rules';
import { useClaim } from '@/state/claim';
import { flightKey, useEntitlements, type PlanOption } from '@/state/entitlements';
import { C, F, R, S, SHADOW, T } from '@/theme';

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
      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={selected ? C.blue : C.faint} />
      <View style={{ flex: 1 }}>
        {!kit ? <Tag text="Best for 4+ trips" tone="gold" style={{ marginBottom: 6 }} /> : null}
        <Text style={styles.planTitle} numberOfLines={1}>
          {kit ? 'This claim' : 'Frequent Flyer'}
        </Text>
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

  // Without a flight (opened from the You tab) only the subscription is offered:
  // a Claim Kit is always bought for a specific flight.
  const { plan } = useLocalSearchParams<{ plan?: string }>();
  const key = facts && plan !== 'annual' ? flightKey(facts) : undefined;
  if (key && ent.isUnlocked(key)) return <Redirect href="/kit" />;

  const verdict = facts && key ? evaluate(effectiveFacts(facts, experience), answersFor(experience, answers)) : undefined;
  const est = verdict?.estimate;
  const fee = est
    ? formatMoney({ amount: Math.round(est.perPassenger.amount * CLAIM_COMPANY_FEE), currency: est.perPassenger.currency })
    : undefined;

  const plans = key ? ent.plans : ent.plans.filter((p) => p.kind === 'annual');
  const kit = plans.find((p) => p.kind === 'kit');
  const annual = plans.find((p) => p.kind === 'annual');
  const selected = plans.find((p) => p.id === selectedId) ?? kit ?? annual;

  const done = () => (key ? router.replace('/kit') : router.back());

  const useCredit = () => {
    if (key && ent.unlock(key)) router.replace('/kit');
  };

  const onBuy = async () => {
    if (!selected) return;
    setBusy(true);
    const result = await ent.purchase(selected, key ?? '');
    setBusy(false);
    if (result === 'unlocked') done();
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
        key && ent.credits > 0 ? (
          <Button title={`Use 1 of ${ent.credits} Claim Kit credit${ent.credits > 1 ? 's' : ''}`} icon="ticket" onPress={useCredit} />
        ) : (
          <Button
            variant="gold"
            title={!selected ? 'Unlock Claim Kit' : selected.kind === 'annual' ? `Start Frequent Flyer · ${selected.priceString}/yr` : `Unlock for ${selected.priceString}`}
            icon="lock-open"
            onPress={onBuy}
            loading={busy}
            disabled={!selected}
          />
        )
      }
      overlap={est && fee ? 56 : 0}
      header={
        <View>
          <BackBar onBack={() => router.back()} title={key ? 'Claim Kit' : 'Plans'} />
          <Text style={styles.title}>
            {key ? (
              <>
                Keep <Text style={{ color: C.gold }}>all</Text> of it.
              </>
            ) : (
              'Frequent Flyer'
            )}
          </Text>
          <Text style={styles.sub}>
            {key ? 'The check is free. Pay once for the part that gets you paid.' : 'Claim Kits for every disrupted flight this year, for less than one claim company fee.'}
          </Text>
        </View>
      }
    >

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
          <View style={[styles.compareCol, styles.compareWin]}>
            <Text style={[styles.compareLabel, { color: C.blue }]}>RefundDrop</Text>
            <Text style={[styles.compareValue, { color: C.blue }]}>{kit?.priceString ?? '$4.99'}</Text>
            <Text style={styles.compareSub}>You keep {formatMoney(est.perPassenger)}</Text>
          </View>
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.delay(180).duration(450)} style={styles.inclCard}>
        <Text style={[T.label, { color: C.blue, marginBottom: S.xs }]}>What you get</Text>
        {INCLUDED.map((i) => (
          <View key={i.text} style={styles.incl}>
            <IconBadge name={i.icon} size={17} />
            <Text style={styles.inclText}>{i.text}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(260).duration(450)} style={{ marginTop: S.xl, gap: S.sm }}>
        {!ent.ready ? (
          <ActivityIndicator color={C.blue} />
        ) : plans.length === 0 ? (
          <Text style={[styles.sub, { color: C.muted }]}>Plans are unavailable right now. Check your connection and try again.</Text>
        ) : (
          plans.map((p) => (
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
        unless cancelled in your store settings. See the You tab for terms and privacy.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...T.h1, color: C.onBlue, fontSize: 36, lineHeight: 42, marginTop: S.lg },
  sub: { ...T.body, color: C.onBlueMuted, marginTop: S.sm },
  compare: { flexDirection: 'row', alignItems: 'stretch', backgroundColor: C.surface, borderRadius: R.xl, padding: S.sm, ...SHADOW },
  compareCol: { flex: 1, alignItems: 'center', paddingVertical: S.lg, borderRadius: R.lg },
  compareWin: { backgroundColor: C.accentSoft, borderWidth: 1.5, borderColor: 'rgba(19,81,231,0.2)' },
  compareLabel: { ...T.label, color: C.muted, fontSize: 10 },
  compareValue: { fontFamily: F.display, fontSize: 30, marginTop: 6, letterSpacing: -0.8 },
  compareSub: { ...T.small, color: C.muted, fontSize: 12, marginTop: 2 },
  vs: { justifyContent: 'center', paddingHorizontal: 6 },
  vsText: { fontFamily: F.bold, color: C.faint, fontSize: 12 },
  inclCard: { backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl, marginTop: S.lg, gap: S.md, ...SHADOW },
  incl: { flexDirection: 'row', gap: S.md, alignItems: 'center' },
  inclText: { ...T.body, color: C.text, flex: 1, fontFamily: F.semibold },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
    padding: S.lg,
    borderRadius: R.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: C.surface,
    ...SHADOW,
  },
  planSelected: { borderColor: C.blue },
  planTitle: { color: C.text, fontSize: 17, fontFamily: F.black },
  planSub: { ...T.small, color: C.muted, marginTop: 2 },
  planPrice: { fontFamily: F.display, color: C.blue, fontSize: 24, flexShrink: 0, letterSpacing: -0.6 },
  planPer: { ...T.small, color: C.faint, fontSize: 11 },
  modeNote: { flexDirection: 'row', gap: S.sm, alignItems: 'flex-start', marginTop: S.lg, backgroundColor: C.infoSoft, padding: S.md, borderRadius: R.md },
  modeText: { ...T.small, color: C.info, flex: 1 },
  restore: { color: C.blue, fontFamily: F.bold },
  fine: { color: C.faint, fontSize: 11, lineHeight: 16, marginTop: S.lg, textAlign: 'center', fontFamily: F.body },
});
