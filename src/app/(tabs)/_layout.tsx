import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
        <View style={styles.scanFill}>
          <Ionicons name="qr-code" size={26} color={C.text} />
        </View>
      </Pressable>
      <Text style={styles.scanLabel}>SCAN</Text>
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
        tabBarActiveTintColor: C.blue,
        tabBarInactiveTintColor: C.faint,
        tabBarStyle: [styles.bar, { height: 62 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 6 }],
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Check', tabBarIcon: icon('shield-checkmark', 'shield-checkmark-outline') }} />
      <Tabs.Screen
        name="claims"
        options={{
          title: 'Claims',
          tabBarIcon: icon('folder-open', 'folder-open-outline'),
          tabBarBadge: due > 0 ? due : undefined,
          tabBarBadgeStyle: { backgroundColor: C.bad, color: '#FFFFFF', fontFamily: F.bold, fontSize: 11 },
        }}
      />
      <Tabs.Screen name="scan-tab" options={{ title: 'Scan', tabBarButton: () => <ScanButton /> }} />
      <Tabs.Screen name="rights" options={{ title: 'Rights', tabBarIcon: icon('hammer', 'hammer-outline') }} />
      <Tabs.Screen name="you" options={{ title: 'Profile', tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: C.surface,
    borderTopWidth: 0,
    shadowColor: '#092570',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  label: { fontFamily: F.bold, fontSize: 11 },
  scanSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  scanButton: {
    marginTop: -22,
    borderRadius: 30,
    shadowColor: C.goldDeep,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  scanFill: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: C.surface, backgroundColor: C.gold },
  scanLabel: { color: C.blue, fontFamily: F.black, fontSize: 11, letterSpacing: 0.6, marginTop: 1 },
});
