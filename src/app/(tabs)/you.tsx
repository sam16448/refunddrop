import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, LogoMark, PageHeader, Screen, SectionLabel, StatTile } from '@/components/ui';
import { walletTotals } from '@/lib/money';
import { INTRO_SEEN_KEY } from '@/lib/storageKeys';
import { DISCLAIMER, EU261_V2004, UK261_V2021, US_DOT_2024 } from '@/rules';
import { useClaims } from '@/state/claims';
import { useEntitlements } from '@/state/entitlements';
import { useHistory } from '@/state/history';
import { C, F, GOLD_GLOW, R, S, SHADOW, T } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function Row({ icon, title, sub, onPress, right, last }: { icon: IconName; title: string; sub?: string; onPress?: () => void; right?: ReactNode; last?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, !last && styles.divider, pressed && onPress && { opacity: 0.7 }]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={C.blue} />
      </View>
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

export default function YouScreen() {
  const ent = useEntitlements();
  const { claims } = useClaims();
  const { recent, clear } = useHistory();
  const wallet = walletTotals(claims);
  const [notif, setNotif] = useState<'granted' | 'denied' | 'undetermined'>();
  const version = `${Application.nativeApplicationVersion ?? '1.0.0'}${Application.nativeBuildVersion ? ` (${Application.nativeBuildVersion})` : ''}`;

  useFocusEffect(
    useCallback(() => {
      Notifications.getPermissionsAsync()
        .then((p) => setNotif(p.status as 'granted' | 'denied' | 'undetermined'))
        .catch(() => setNotif(undefined));
    }, []),
  );

  const enableReminders = async () => {
    if (notif === 'denied') return Linking.openSettings().catch(() => {});
    const p = await Notifications.requestPermissionsAsync().catch(() => undefined);
    if (p) setNotif(p.status as 'granted' | 'denied' | 'undetermined');
  };

  const modeNote = ent.mode === 'preview' ? 'Expo Go preview — purchases unlock without charging' : ent.mode === 'demo' ? 'Demo mode — no RevenueCat key' : undefined;

  return (
    <Screen tab overlap={64} header={<PageHeader title="Profile" sub="Your plan, reminders and privacy" right={<LogoMark size={44} />} />}>
      <View style={[styles.plan, ent.pro && styles.planPro]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <View style={[styles.planIcon, ent.pro && { backgroundColor: C.text }]}>
            <Ionicons name={ent.pro ? 'star' : 'airplane'} size={20} color={ent.pro ? C.gold : C.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.planLabel}>YOUR PLAN</Text>
            <Text style={styles.planName}>{ent.pro ? 'Frequent Flyer' : 'Free'}</Text>
          </View>
          {ent.credits > 0 ? (
            <View style={styles.credit}>
              <Ionicons name="ticket" size={13} color={C.good} />
              <Text style={styles.creditText}>
                {ent.credits} Kit credit{ent.credits > 1 ? 's' : ''}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.planBody}>
          {ent.pro
            ? 'Unlimited Claim Kits for every flight this year. Checks are always free.'
            : 'Checks are always free. Buy a Claim Kit for one flight ($4.99), or go Frequent Flyer for every flight this year ($19.99).'}
        </Text>
        {!ent.pro ? (
          <View style={{ marginTop: S.lg }}>
            <Button title="See Frequent Flyer" variant="gold" icon="star" iconRight="arrow-forward" onPress={() => router.push({ pathname: '/paywall', params: { plan: 'annual' } })} />
          </View>
        ) : null}
        {modeNote ? <Text style={styles.modeNote}>{modeNote}</Text> : null}
      </View>

      <View style={styles.stats}>
        <StatTile label="Claims" value={String(claims.length)} caption={`${wallet.paidCount} paid`} />
        <StatTile label="Received" value={wallet.received} caption="kept 100%" color={C.good} />
      </View>

      <SectionLabel>Settings</SectionLabel>
      <Block>
        <Row
          icon="notifications-outline"
          title="Follow-up reminders"
          sub={notif === 'granted' ? 'On — we’ll nudge you 14 days after you send a claim' : notif === 'denied' ? 'Off — turn on in Settings' : 'Get a nudge when a follow-up is due'}
          onPress={notif === 'granted' ? undefined : enableReminders}
          right={notif === 'granted' ? <Ionicons name="checkmark-circle" size={20} color={C.good} /> : undefined}
        />
        <Row
          icon="refresh"
          title="Restore purchases"
          sub="Bought on another phone or reinstalled?"
          onPress={async () => {
            const ok = await ent.restorePurchases();
            Alert.alert(ok ? 'Purchases restored' : 'Nothing to restore', ok ? 'Your Claim Kits and subscription are available again.' : 'Restore works in the installed app with a store account.');
          }}
        />
        <Row
          icon="time-outline"
          title="Clear recent checks"
          sub={recent.length ? `${recent.length} saved on this phone` : 'Nothing saved'}
          onPress={recent.length ? clear : undefined}
          last
        />
      </Block>

      <SectionLabel>How RefundDrop decides</SectionLabel>
      <Block>
        <Row icon="git-branch-outline" title="Deterministic rules engine" sub="Every verdict comes from tested, published rules — never an AI guess." />
        <Row icon="document-text-outline" title="Rules in use" sub={`${EU261_V2004.version}\n${UK261_V2021.version}\n${US_DOT_2024.version}`} last />
      </Block>

      <SectionLabel>Privacy</SectionLabel>
      <Block>
        <Text style={styles.para}>
          Your claims, names and booking references stay on this phone. Boarding passes are read on the phone and never saved or
          uploaded. Only the flight number and date go online, to look up flight times. Purchases go through the app store and
          RevenueCat. No accounts, no ads, no tracking.
        </Text>
      </Block>

      <SectionLabel>Terms</SectionLabel>
      <Block>
        <Text style={styles.para}>
          {DISCLAIMER} RefundDrop does not submit claims or act for you. A Claim Kit is a one-time purchase for one flight; Frequent
          Flyer renews yearly until cancelled in your store account settings. Sample flights and the sample boarding pass are
          illustrative.
        </Text>
      </Block>

      <SectionLabel>More</SectionLabel>
      <Block>
        <Row
          icon="play-circle-outline"
          title="Show the intro again"
          onPress={() => {
            AsyncStorage.removeItem(INTRO_SEEN_KEY).catch(() => {});
            router.push('/intro');
          }}
        />
        <Row icon="logo-github" title="Open source on GitHub" sub="MIT licensed" onPress={() => Linking.openURL('https://github.com/sam16448/refunddrop').catch(() => {})} />
        <Row icon="information-circle-outline" title="Version" right={<Text style={styles.rowSub}>{version}</Text>} last />
      </Block>
      <Text style={styles.made}>Made for travellers who are tired of being told “no”.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  plan: { borderRadius: R.xl, padding: S.xl, backgroundColor: C.surface, ...SHADOW },
  planPro: { backgroundColor: C.gold, ...GOLD_GLOW },
  planIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  planLabel: { ...T.label, color: C.muted, fontSize: 10 },
  planName: { fontFamily: F.display, color: C.text, fontSize: 26, marginTop: 2, letterSpacing: -0.6 },
  planBody: { ...T.small, color: C.muted, marginTop: S.md },
  credit: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.goodSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  creditText: { color: C.good, fontFamily: F.bold, fontSize: 12 },
  modeNote: { ...T.small, color: C.blue, fontFamily: F.semibold, fontSize: 12, marginTop: S.md, backgroundColor: C.accentSoft, padding: S.sm, borderRadius: R.sm, overflow: 'hidden' },
  stats: { flexDirection: 'row', gap: S.md, marginTop: S.md },
  block: { backgroundColor: C.surface, borderRadius: R.xl, paddingHorizontal: S.lg, ...SHADOW },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.md },
  rowIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: C.text, fontFamily: F.bold, fontSize: 15 },
  rowSub: { ...T.small, color: C.muted, marginTop: 2 },
  para: { ...T.small, color: C.muted, paddingVertical: S.lg },
  made: { ...T.small, color: C.faint, textAlign: 'center', marginTop: S.xl, fontSize: 12 },
});
