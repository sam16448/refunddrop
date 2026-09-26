import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Button, Screen } from '@/components/ui';
import { INTRO_SEEN_KEY } from '@/lib/storageKeys';
import { C, F, R, S, T } from '@/theme';

const STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  { icon: 'scan', title: 'Scan your boarding pass', body: 'We read the barcode and pull the real arrival time.' },
  {
    icon: 'shield-checkmark',
    title: 'Get an honest answer',
    body: 'EU, UK and US rules applied step by step, with the law behind each step — including when you’re not owed anything.',
  },
  { icon: 'wallet', title: 'Claim it yourself, keep 100%', body: 'Ready-to-send letters and follow-ups, instead of giving a claim company a third.' },
];

export default function IntroScreen() {
  const done = () => {
    AsyncStorage.setItem(INTRO_SEEN_KEY, '1').catch(() => {});
    router.replace('/');
  };

  return (
    <Screen footer={<Button title="Check a flight" icon="arrow-forward" onPress={done} />}>
      <Animated.View entering={FadeInUp.duration(600)} style={styles.hero}>
        <LinearGradient colors={[C.accent, C.accent2]} style={styles.logo}>
          <Ionicons name="airplane" size={30} color={C.accentInk} />
        </LinearGradient>
        <Text style={styles.big}>€600</Text>
        <Text style={styles.title}>That’s what airlines can owe you for one long delay.</Text>
        <Text style={styles.sub}>Most passengers never claim it.</Text>
      </Animated.View>

      {STEPS.map((s, i) => (
        <Animated.View key={s.title} entering={FadeInDown.delay(200 + i * 120).duration(500)} style={styles.step}>
          <View style={styles.num}>
            <Text style={styles.numText}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={s.icon} size={16} color={C.accent} />
              <Text style={styles.stepTitle}>{s.title}</Text>
            </View>
            <Text style={styles.stepBody}>{s.body}</Text>
          </View>
        </Animated.View>
      ))}
      <Text style={styles.fine}>Information, not legal advice. Your claims stay on this phone.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: S.lg, marginBottom: S.xl },
  logo: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: S.xl },
  big: { fontFamily: F.display, color: C.accent, fontSize: 72, letterSpacing: -2, lineHeight: 78 },
  title: { ...T.h1, color: C.text, fontSize: 28, lineHeight: 34, marginTop: S.xs },
  sub: { ...T.body, color: C.muted, marginTop: S.sm, fontSize: 17 },
  step: { flexDirection: 'row', gap: S.lg, backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, marginBottom: S.md, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  num: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: F.display, color: C.accent, fontSize: 15 },
  stepTitle: { color: C.text, fontSize: 16, fontFamily: F.bold },
  stepBody: { ...T.small, color: C.muted, marginTop: 4 },
  fine: { color: C.faint, fontSize: 12, textAlign: 'center', marginTop: S.lg, fontFamily: F.body },
});
