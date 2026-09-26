import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { goToTab } from '@/lib/nav';
import { ClaimProvider } from '@/state/claim';
import { ClaimsProvider } from '@/state/claims';
import { EntitlementsProvider } from '@/state/entitlements';
import { HistoryProvider } from '@/state/history';
import { C, F, S } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: C.bg, card: C.bg, text: C.text, border: C.line, primary: C.accent },
};

/** Shown instead of a crash screen if any screen throws. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorRoot}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorBody}>RefundDrop hit an unexpected problem. Your saved claims are safe on this phone.</Text>
      <Text style={styles.errorDetail} numberOfLines={3}>
        {error.message}
      </Text>
      <Pressable onPress={retry} style={styles.errorButton} accessibilityRole="button">
        <Text style={styles.errorButtonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  // Tapping a follow-up reminder opens the claims tracker.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => goToTab('/claims'));
    return () => sub.remove();
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <EntitlementsProvider>
          <ClaimsProvider>
            <HistoryProvider>
              <ClaimProvider>
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: C.bg },
                    animation: 'slide_from_right',
                  }}
                >
                  <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
                  <Stack.Screen name="intro" options={{ animation: 'fade' }} />
                  <Stack.Screen name="scan" options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }} />
                  <Stack.Screen name="paywall" options={{ animation: 'slide_from_bottom' }} />
                </Stack>
              </ClaimProvider>
            </HistoryProvider>
          </ClaimsProvider>
        </EntitlementsProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorRoot: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', padding: S.xl, gap: S.md },
  errorTitle: { color: C.text, fontSize: 26, fontFamily: F.display },
  errorBody: { color: C.muted, fontSize: 15, lineHeight: 22 },
  errorDetail: { color: C.faint, fontSize: 12 },
  errorButton: { marginTop: S.md, backgroundColor: C.accent, borderRadius: 999, height: 52, alignItems: 'center', justifyContent: 'center' },
  errorButtonText: { color: C.accentInk, fontSize: 16, fontWeight: '700' },
});
