import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FOLLOW_UP_DAYS } from '@/services/reminders';
import { addDays, todayIso, useClaims } from '@/state/claims';
import { C, F } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function icon(active: IconName, idle: IconName) {
  function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
    // Ionicons takes a string colour; the tab bar always passes our string tokens.
    return <Ionicons name={focused ? active : idle} size={23} color={color as string} />;
  }
  return TabIcon;
}

/** Raised amber button in the middle of the tab bar: opens the scanner. */
function ScanButton() {
  return (
    <View style={styles.scanSlot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Scan boarding pass"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          router.push('/scan');
        }}
        style={({ pressed }) => [styles.scanButton, pressed && { transform: [{ scale: 0.94 }] }]}
      >
        <LinearGradient colors={[C.accent, C.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scanFill}>
          <Ionicons name="scan" size={26} color={C.accentInk} />
        </LinearGradient>
      </Pressable>
      <Text style={styles.scanLabel}>Scan</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { claims } = useClaims();
  const insets = useSafeAreaInsets();
  const today = todayIso();
  // Claims that need the user to do something: follow-up due, or rejected.
  const due = claims.filter(
    (c) => c.status === 'rejected' || (c.status === 'sent' && addDays(c.sentOn ?? today, FOLLOW_UP_DAYS) <= today),
  ).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: [styles.bar, { height: 62 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 6 }],
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Check', tabBarIcon: icon('airplane', 'airplane-outline') }} />
      <Tabs.Screen
        name="claims"
        options={{
          title: 'Claims',
          tabBarIcon: icon('wallet', 'wallet-outline'),
          tabBarBadge: due > 0 ? due : undefined,
          tabBarBadgeStyle: { backgroundColor: C.accent, color: C.accentInk, fontFamily: F.bold, fontSize: 11 },
        }}
      />
      <Tabs.Screen name="scan-tab" options={{ title: 'Scan', tabBarButton: () => <ScanButton /> }} />
      <Tabs.Screen name="rights" options={{ title: 'Rights', tabBarIcon: icon('shield-checkmark', 'shield-checkmark-outline') }} />
      <Tabs.Screen name="you" options={{ title: 'You', tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#0D1322', borderTopColor: C.line, borderTopWidth: StyleSheet.hairlineWidth },
  label: { fontFamily: F.semibold, fontSize: 11 },
  scanSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  scanButton: {
    marginTop: -18,
    borderRadius: 28,
    shadowColor: C.accent,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  scanFill: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: C.bg },
  scanLabel: { color: C.faint, fontFamily: F.semibold, fontSize: 11, marginTop: 1 },
});
