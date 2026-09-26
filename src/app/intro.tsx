import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Screen } from '@/components/ui';
import { C, R, S, T } from '@/theme';

import { INTRO_SEEN_KEY } from '@/lib/storageKeys';

const STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'scan',
    title: 'Scan your boarding pass',
    body: 'We read the barcode and pull the real arrival time for your flight.',
  },
  {
    icon: 'shield-checkmark',
    title: 'Get an honest answer',
    body: 'EU, UK and US passenger rules, applied step by step, with the law behind each step. We tell you when you’re not owed anything too.',
  },
  {
    icon: 'wallet',
    title: 'Claim it yourself, keep 100%',
    body: 'A ready-to-send letter and follow-ups, instead of giving a claim company a third of your money.',
  },
];

export default function IntroScreen() {
  const done = () => {
    AsyncStorage.setItem(INTRO_SEEN_KEY, '1').catch(() => {});
    router.replace('/');
  };

  return (
    <Screen footer={<Button title="Check a flight" onPress={done} />}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>RefundDrop</Text>
        <Text style={styles.title}>Airlines owe passengers up to €600 for long delays.</Text>
        <Text style={styles.sub}>Most people never claim it.</Text>
      </View>
      {STEPS.map((s, i) => (
        <View key={s.title} style={styles.step}>
          <View style={styles.iconWrap}>
            <Ionicons name={s.icon} size={22} color={C.accentInk} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>
              {i + 1}. {s.title}
            </Text>
            <Text style={styles.stepBody}>{s.body}</Text>
          </View>
        </View>
      ))}
      <Text style={styles.fine}>Information, not legal advice. Your claims are stored only on this phone.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { marginTop: S.xl, marginBottom: S.xl },
  eyebrow: { ...T.label, color: C.accent },
  title: { ...T.h1, color: C.text, fontSize: 32, lineHeight: 38, marginTop: S.md },
  sub: { ...T.body, color: C.muted, marginTop: S.sm, fontSize: 17 },
  step: { flexDirection: 'row', gap: S.lg, backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, marginBottom: S.md },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
  stepBody: { ...T.small, color: C.muted, marginTop: 4 },
  fine: { color: C.faint, fontSize: 12, textAlign: 'center', marginTop: S.lg },
});
