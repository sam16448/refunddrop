import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Button, Logo, Screen, Tag } from '@/components/ui';
import { INTRO_SEEN_KEY } from '@/lib/storageKeys';
import { C, F, GOLD_GLOW, R, S, SHADOW, T } from '@/theme';

const STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; gold?: boolean }[] = [
  { icon: 'scan', title: 'Scan your boarding pass', body: 'Reads the barcode and pulls the real arrival time.' },
  { icon: 'hammer', title: 'Get an honest verdict', body: 'EU, UK and US rules applied step by step, with the law behind each one.', gold: true },
  { icon: 'paper-plane', title: 'Send a ready-made claim', body: 'Letters, a day-14 follow-up and a free escalation. You keep 100%.' },
];

export default function IntroScreen() {
  const done = () => {
    AsyncStorage.setItem(INTRO_SEEN_KEY, '1').catch(() => {});
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen
      blue
      footer={
        <>
          <Button title="Check your flight now" variant="gold" iconRight="arrow-forward" onPress={done} />
          <Text style={styles.trustLine}>Free check · No card needed · Not legal advice</Text>
        </>
      }
    >
      <Animated.View entering={FadeInUp.duration(600)}>
        <Logo size={36} />
        <Tag text="Real EU & UK passenger rights" tone="gold" icon="flash" style={{ marginTop: S.xl }} />
        <Text style={styles.hero}>
          Airlines owe you cash.{'\n'}
          <Text style={{ color: C.gold }}>Keep 100% of it.</Text>
        </Text>
        <Text style={styles.sub}>
          Claim companies take up to 35% of your payout. RefundDrop checks your flight for free and gives you everything to claim it
          yourself.
        </Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(500)}>
        <Pressable onPress={done} style={({ pressed }) => [styles.goldCard, pressed && { transform: [{ scale: 0.99 }] }]} accessibilityRole="button">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
            <Tag text="Free eligibility check" tone="white" icon="gift-outline" />
            <Tag text="EC 261/2004" tone="white" icon="shield-checkmark-outline" />
          </View>
          <Text style={styles.goldLabel}>COMPENSATION PER PASSENGER</Text>
          <Text style={styles.goldAmount}>
            Up to €600 <Text style={styles.goldCash}>cash</Text>
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.md }}>
            <Tag text="0% commission" tone="white" icon="lock-closed-outline" />
            <View style={styles.goArrow}>
              <Ionicons name="arrow-forward" size={20} color={C.gold} />
            </View>
          </View>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.math}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[T.label, { color: C.blue }]}>The math check</Text>
          <Text style={styles.mathNote}>Per passenger</Text>
        </View>
        <View style={[styles.mathRow, { backgroundColor: C.accentSoft }]}>
          <View style={[styles.mathIcon, { backgroundColor: C.blue }]}>
            <Ionicons name="checkmark" size={18} color={C.onBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mathTitle}>RefundDrop</Text>
            <Text style={styles.mathSub}>No cut taken</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.mathAmount, { color: C.blue }]}>€600</Text>
            <Text style={styles.mathTiny}>100% TO YOU</Text>
          </View>
        </View>
        <View style={styles.mathRow}>
          <View style={[styles.mathIcon, { backgroundColor: C.surfaceHi }]}>
            <Ionicons name="close" size={18} color={C.muted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mathTitle}>Claim companies</Text>
            <Text style={[styles.mathSub, { color: C.bad }]}>Take ~35% commission</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.mathAmount, { color: C.faint, textDecorationLine: 'line-through' }]}>€390</Text>
            <Text style={[styles.mathTiny, { color: C.bad }]}>−€210 FEE</Text>
          </View>
        </View>
        <View style={styles.pocket}>
          <Ionicons name="star-outline" size={18} color={C.text} />
          <Text style={styles.pocketText}>+€210 more cash in your pocket</Text>
        </View>
      </Animated.View>

      <View style={styles.howHead}>
        <Text style={[T.label, { color: C.onBlue }]}>How RefundDrop works</Text>
        <Text style={[T.label, { color: C.gold }]}>3 min</Text>
      </View>
      {STEPS.map((s, i) => (
        <Animated.View key={s.title} entering={FadeInDown.delay(350 + i * 100).duration(500)} style={styles.step}>
          <View style={[styles.stepIcon, s.gold && { backgroundColor: C.goldSoft }]}>
            <Ionicons name={s.icon} size={22} color={s.gold ? C.text : C.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
              <Tag text={`Step ${i + 1}`} tone={s.gold ? 'gold' : 'blue'} />
            </View>
            <Text style={styles.stepTitle}>{s.title}</Text>
            <Text style={styles.stepBody}>{s.body}</Text>
          </View>
        </Animated.View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { fontFamily: F.display, color: C.onBlue, fontSize: 36, lineHeight: 40, letterSpacing: -1.2, marginTop: S.md },
  sub: { ...T.body, color: C.onBlueMuted, marginTop: S.md, fontSize: 16, lineHeight: 24 },
  goldCard: { backgroundColor: C.gold, borderRadius: R.xl, padding: S.xl, marginTop: S.xl, ...GOLD_GLOW },
  goldLabel: { ...T.label, color: '#5A4700', marginTop: S.lg },
  goldAmount: { fontFamily: F.display, color: C.text, fontSize: 44, letterSpacing: -1.6, lineHeight: 50 },
  goldCash: { fontFamily: F.bold, fontSize: 20, letterSpacing: 0 },
  goArrow: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.goldInk, alignItems: 'center', justifyContent: 'center' },
  math: { backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl, marginTop: S.lg, ...SHADOW },
  mathNote: { color: C.muted, fontFamily: F.semibold, fontSize: 12 },
  mathRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.bg, borderRadius: 999, padding: S.md, paddingRight: S.lg, marginTop: S.md },
  mathIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  mathTitle: { color: C.text, fontFamily: F.black, fontSize: 15 },
  mathSub: { color: C.muted, fontFamily: F.semibold, fontSize: 12 },
  mathAmount: { fontFamily: F.display, fontSize: 22, letterSpacing: -0.6 },
  mathTiny: { color: C.text, fontFamily: F.black, fontSize: 10, letterSpacing: 0.6 },
  pocket: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.gold, borderRadius: 999, paddingVertical: S.md, paddingHorizontal: S.lg, marginTop: S.md },
  pocketText: { color: C.text, fontFamily: F.black, fontSize: 15, flex: 1 },
  howHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: S.xl, marginBottom: S.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: S.lg, backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, marginBottom: S.md },
  stepIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { color: C.text, fontFamily: F.black, fontSize: 16, marginTop: 6 },
  stepBody: { ...T.small, color: C.muted, marginTop: 2 },
  trustLine: { color: C.onBlueMuted, fontFamily: F.semibold, fontSize: 12, textAlign: 'center' },
});
