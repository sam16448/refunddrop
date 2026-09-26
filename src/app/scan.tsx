import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { SAMPLE_BOARDING_PASS } from '@/data/sampleBoardingPass';
import { BoardingPassError, parseBoardingPass } from '@/services/boardingPass';
import { lookupFlight } from '@/services/flightLookup';
import { useClaim } from '@/state/claim';
import { C, R, S, T } from '@/theme';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { setFlight, setPassenger } = useClaim();
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const busy = useRef(false);

  const handle = async (data: string) => {
    if (busy.current) return;
    busy.current = true;
    setError(undefined);
    try {
      const bp = parseBoardingPass(data);
      const leg = bp.legs[0];
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setStatus(`${leg.flightNumber} · ${leg.from} → ${leg.to} · ${leg.date}`);
      const result = await lookupFlight(leg.flightNumber, leg.date);
      if (result.kind === 'error') {
        setError(result.message);
        setStatus(undefined);
        setTimeout(() => (busy.current = false), 1500);
        return;
      }
      const facts = result.kind === 'sample' ? result.sample.facts : result.flights[0];
      setFlight(facts, result.kind);
      setPassenger({ name: bp.passengerName, bookingRef: bp.bookingRef });
      router.replace('/flight');
    } catch (e) {
      setError(e instanceof BoardingPassError ? "That doesn't look like a boarding pass barcode. Try the other code on the pass." : 'Could not read that code.');
      setStatus(undefined);
      setTimeout(() => (busy.current = false), 1500);
    }
  };

  const onScanned = (r: BarcodeScanningResult) => handle(r.data);

  return (
    <View style={styles.root}>
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['pdf417', 'aztec', 'qr', 'datamatrix'] }}
          onBarcodeScanned={status ? undefined : onScanned}
        />
      ) : null}

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={28} color={C.text} />
          </Pressable>
          <Text style={styles.topTitle}>Scan boarding pass</Text>
          <View style={{ width: 28 }} />
        </View>

        {permission?.granted ? (
          <View style={styles.frameWrap}>
            <View style={styles.frame} />
            <Text style={styles.hint}>Fit the barcode on your paper or mobile boarding pass inside the frame</Text>
          </View>
        ) : (
          <View style={styles.permission}>
            <Ionicons name="camera-outline" size={40} color={C.muted} />
            <Text style={styles.permText}>
              RefundDrop reads the barcode on your boarding pass to fill in your flight, date and booking reference. Nothing
              leaves your phone except the flight lookup.
            </Text>
            {permission ? <Button title="Allow camera" onPress={requestPermission} /> : <ActivityIndicator color={C.accent} />}
          </View>
        )}

        <View style={styles.bottom}>
          {status ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={C.accent} />
              <Text style={styles.statusText}>{status}</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Try a sample boarding pass" variant="ghost" icon="ticket-outline" onPress={() => handle(SAMPLE_BOARDING_PASS)} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S.xl, paddingTop: S.md },
  topTitle: { color: C.text, fontSize: 17, fontWeight: '800' },
  frameWrap: { alignItems: 'center', paddingHorizontal: S.xl },
  frame: { width: '100%', aspectRatio: 1.6, borderWidth: 3, borderColor: C.accent, borderRadius: R.lg },
  hint: { color: C.text, textAlign: 'center', marginTop: S.md, ...T.small, textShadowColor: '#000', textShadowRadius: 6 },
  permission: { alignItems: 'center', paddingHorizontal: S.xl, gap: S.lg },
  permText: { color: C.muted, textAlign: 'center', ...T.body },
  bottom: { paddingHorizontal: S.xl, paddingBottom: S.lg, gap: S.md },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.surface, padding: S.md, borderRadius: R.md },
  statusText: { color: C.text, fontWeight: '700' },
  error: { color: C.bad, backgroundColor: C.surface, padding: S.md, borderRadius: R.md, overflow: 'hidden', ...T.small },
});
