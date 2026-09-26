import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { BackBar, Screen, SectionLabel } from '@/components/ui';
import { INTRO_SEEN_KEY } from '@/lib/storageKeys';
import { DISCLAIMER, EU261_V2004, UK261_V2021, US_DOT_2024 } from '@/rules';
import { useEntitlements } from '@/state/entitlements';
import { C, F, R, S, T } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function Row({ icon, title, sub, onPress, right }: { icon: IconName; title: string; sub?: string; onPress?: () => void; right?: ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && onPress && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={20} color={C.accent} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={C.faint} /> : null)}
    </Pressable>
  );
}

function Block({ children }: { children: ReactNode }) {
  return <View style={styles.block}>{children}</View>;
}

const SOURCES: { title: string; url: string }[] = [
  { title: 'Regulation (EC) No 261/2004 (EUR-Lex)', url: 'https://eur-lex.europa.eu/eli/reg/2004/261/oj' },
  { title: 'Your Europe: air passenger rights', url: 'https://europa.eu/youreurope/citizens/travel/passenger-rights/air/index_en.htm' },
  { title: 'UK CAA: delays and cancellations', url: 'https://www.caa.co.uk/air-passengers/travel-problems-and-rights/flight-delays-and-cancellations/delays/' },
  { title: 'US DOT: refunds', url: 'https://www.transportation.gov/airconsumer/refunds' },
];

export default function AboutScreen() {
  const ent = useEntitlements();
  const version = `${Application.nativeApplicationVersion ?? '1.0.0'}${Application.nativeBuildVersion ? ` (${Application.nativeBuildVersion})` : ''}`;

  return (
    <Screen>
      <BackBar onBack={() => router.back()} title="About" />
      <Text style={styles.title}>RefundDrop</Text>
      <Text style={styles.sub}>Honest flight-disruption rights, and a claim kit so you keep 100%.</Text>

      <SectionLabel>Your purchases</SectionLabel>
      <Block>
        <Row
          icon="star-outline"
          title={ent.pro ? 'Frequent Flyer: active' : 'Frequent Flyer: not active'}
          sub={`${ent.credits} unused Claim Kit credit${ent.credits === 1 ? '' : 's'}${ent.mode !== 'live' ? ` · ${ent.mode === 'preview' ? 'Expo Go preview' : 'demo mode'}` : ''}`}
        />
        <Row
          icon="refresh"
          title="Restore purchases"
          onPress={async () => {
            const ok = await ent.restorePurchases();
            Alert.alert(ok ? 'Purchases restored' : 'Nothing to restore', ok ? undefined : 'Restore works in the installed app with a store account.');
          }}
        />
      </Block>

      <SectionLabel>How it decides</SectionLabel>
      <Block>
        <Row icon="git-branch-outline" title="Deterministic rules engine" sub="Every verdict comes from tested, published rules — never from an AI guess." />
        <Row icon="document-text-outline" title="Rules in use" sub={`${EU261_V2004.version}\n${UK261_V2021.version}\n${US_DOT_2024.version}`} />
        {SOURCES.map((s) => (
          <Row key={s.url} icon="link-outline" title={s.title} onPress={() => Linking.openURL(s.url).catch(() => {})} />
        ))}
      </Block>

      <SectionLabel>Privacy</SectionLabel>
      <Block>
        <Text style={styles.para}>
          Your claims, names and booking references are stored only on this phone. Boarding passes are read on the phone and
          the image is never saved or uploaded. The only thing sent over the internet is the flight number and date, to look
          up flight times. Purchases are handled by the app store and RevenueCat. There are no accounts, ads or tracking.
        </Text>
      </Block>

      <SectionLabel>Terms</SectionLabel>
      <Block>
        <Text style={styles.para}>
          {DISCLAIMER} RefundDrop does not submit claims or act for you. The Claim Kit is a one-time purchase for one flight;
          the Frequent Flyer plan renews yearly until cancelled in your store account settings. Sample flights and the sample
          boarding pass are illustrative.
        </Text>
      </Block>

      <SectionLabel>More</SectionLabel>
      <Block>
        <Row
          icon="play-circle-outline"
          title="Show the intro again"
          onPress={() => {
            AsyncStorage.removeItem(INTRO_SEEN_KEY).catch(() => {});
            router.replace('/intro');
          }}
        />
        <Row icon="logo-github" title="Open source on GitHub" sub="MIT licensed" onPress={() => Linking.openURL('https://github.com/sam16448/refunddrop').catch(() => {})} />
        <Row icon="information-circle-outline" title="Version" right={<Text style={styles.rowSub}>{version}</Text>} />
      </Block>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...T.h1, color: C.text },
  sub: { ...T.body, color: C.muted, marginTop: S.xs },
  block: { backgroundColor: C.surface, borderRadius: R.lg, paddingHorizontal: S.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  rowTitle: { color: C.text, fontFamily: F.semibold, fontSize: 15 },
  rowSub: { ...T.small, color: C.muted, marginTop: 2 },
  para: { ...T.small, color: C.muted, paddingVertical: S.lg },
});
