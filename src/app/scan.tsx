import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, HeaderButton, IconBadge, Screen, Tag } from '@/components/ui';
import { SAMPLE_BOARDING_PASS } from '@/data/sampleBoardingPass';
import { SAMPLE_FLIGHTS } from '@/data/sampleFlights';
import { evaluate, formatMoney } from '@/rules';
import { BoardingPassError, parseBoardingPass } from '@/services/boardingPass';
import { lookupFlight } from '@/services/flightLookup';
import { useClaim } from '@/state/claim';
import { C, F, GOLD_GLOW, R, S, SHADOW, T } from '@/theme';

// The sample pass is LH 764 Frankfurt → Mumbai; show what it is worth using the real rules.
const DEMO = SAMPLE_FLIGHTS.find((s) => s.facts.flightNumber === 'LH 764');
const DEMO_AMOUNT = (() => {
  if (!DEMO) return undefined;
  const v = evaluate(DEMO.facts, DEMO.demoAnswers);
  return v.estimate && v.outcome === 'likely' ? formatMoney(v.estimate.perPassenger) : undefined;
})();

function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const top = pos[0] === 't';
  const left = pos[1] === 'l';
  return (
    <View
      pointerEvents="none"
      style={[
        styles.corner,
        top ? { top: 18, borderTopWidth: 5 } : { bottom: 18, borderBottomWidth: 5 },
        left ? { left: 18, borderLeftWidth: 5 } : { right: 18, borderRightWidth: 5 },
        { [`border${top ? 'Top' : 'Bottom'}${left ? 'Left' : 'Right'}Radius`]: 26 },
      ]}
    />
  );
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { setFlight, setPassenger } = useClaim();
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const [torch, setTorch] = useState(false);
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
  const granted = Boolean(permission?.granted);

  const header = (
    <View>
      <View style={styles.topRow}>
        <HeaderButton icon="close" label="Close" onPress={() => router.back()} />
        <Tag text={granted ? 'Live barcode scanner' : 'Boarding pass scanner'} tone="glass" icon="radio-button-on" style={{ alignSelf: 'center' }} />
        <View style={{ width: 42 }} />
      </View>

      <View style={styles.viewfinder}>
        {granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['pdf417', 'aztec', 'qr', 'datamatrix'] }}
            onBarcodeScanned={status ? undefined : onScanned}
          />
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.qrCircle}>
              <Ionicons name="qr-code-outline" size={44} color="rgba(255,255,255,0.85)" />
            </View>
            <Text style={styles.vfTitle}>Align your boarding pass</Text>
            <Text style={styles.vfSub}>
              RefundDrop reads the barcode to fill in your flight, date and booking reference. Allow the camera to start.
            </Text>
            {permission ? (
              <View style={{ marginTop: S.lg, alignSelf: 'stretch', paddingHorizontal: S.xl }}>
                <Button title="Allow camera" variant="white" icon="camera-outline" onPress={requestPermission} />
              </View>
            ) : (
              <ActivityIndicator color={C.onBlue} style={{ marginTop: S.lg }} />
            )}
          </View>
        )}
        <Corner pos="tl" />
        <Corner pos="tr" />
        <Corner pos="bl" />
        <Corner pos="br" />
        {granted ? (
          <View style={styles.vfFoot} pointerEvents="none">
            <Tag text="Fit the barcode inside the corners" tone="navy" icon="scan-outline" />
          </View>
        ) : null}
      </View>

      {status ? (
        <View style={styles.statusRow}>
          <ActivityIndicator color={C.blue} />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>Boarding pass read</Text>
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>
      ) : null}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={18} color={C.bad} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.tools}>
        {granted ? (
          <Pressable
            onPress={() => setTorch((t) => !t)}
            style={({ pressed }) => [styles.tool, torch && styles.toolOn, pressed && { opacity: 0.8 }]}
            accessibilityRole="switch"
            accessibilityState={{ checked: torch }}
            accessibilityLabel="Flashlight"
          >
            <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={18} color={torch ? C.text : C.onBlue} />
            <Text style={[styles.toolText, torch && { color: C.text }]}>Flashlight</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.tool, pressed && { opacity: 0.8 }]} accessibilityRole="button">
          <Ionicons name="keypad-outline" size={18} color={C.onBlue} />
          <Text style={styles.toolText}>Type it in</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <Screen header={header}>
      <View style={styles.compat}>
        <IconBadge name="phone-portrait-outline" />
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Works with any boarding pass</Text>
          <Text style={styles.cardSub}>Apple Wallet, Google Wallet, paper passes and airline PDFs on another screen.</Text>
        </View>
      </View>

      <Pressable
        onPress={() => handle(SAMPLE_BOARDING_PASS)}
        style={({ pressed }) => [styles.demo, pressed && { transform: [{ scale: 0.99 }] }]}
        accessibilityRole="button"
        accessibilityLabel="Try a sample boarding pass"
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Tag text="Sample boarding pass" tone="white" icon="flash" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={styles.demoLink}>TAP TO TEST</Text>
            <Ionicons name="arrow-forward" size={15} color={C.text} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: S.md, gap: S.md }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.demoTitle}>{DEMO ? `${DEMO.facts.operatingCarrier.name} ${DEMO.facts.flightNumber}` : 'Sample flight'}</Text>
            <Text style={styles.demoSub}>{DEMO ? `${DEMO.facts.origin.iata} → ${DEMO.facts.destination.iata} · ${DEMO.subtitle}` : ''}</Text>
          </View>
          {DEMO_AMOUNT ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.demoAmount}>{DEMO_AMOUNT}</Text>
              <Text style={styles.demoAmountSub}>EU261</Text>
            </View>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Ionicons name="keypad-outline" size={20} color={C.muted} />
          <Text style={styles.cardTitle}>Can’t scan the barcode?</Text>
        </View>
        <Text style={[styles.cardSub, { marginTop: S.xs }]}>Type your flight number and date instead. It takes about ten seconds.</Text>
        <View style={{ marginTop: S.lg }}>
          <Button title="Enter flight manually" variant="ghost" iconRight="arrow-forward" onPress={() => router.back()} />
        </View>
      </View>

      <View style={styles.privacy}>
        <Ionicons name="shield-checkmark" size={16} color={C.blue} />
        <Text style={styles.privacyText}>The barcode is read on your phone and never uploaded. Only the flight number and date go online.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: S.xs, marginBottom: S.lg },
  viewfinder: { height: 320, borderRadius: R.xl, backgroundColor: C.blueDeep, overflow: 'hidden', justifyContent: 'center' },
  placeholder: { alignItems: 'center', paddingHorizontal: S.xl },
  qrCircle: { width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: S.lg },
  vfTitle: { color: C.onBlue, fontFamily: F.display, fontSize: 22, letterSpacing: -0.5 },
  vfSub: { ...T.small, color: C.onBlueMuted, textAlign: 'center', marginTop: S.xs },
  corner: { position: 'absolute', width: 46, height: 46, borderColor: C.gold },
  vfFoot: { position: 'absolute', bottom: 22, left: 0, right: 0, alignItems: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.surface, padding: S.lg, borderRadius: R.lg, marginTop: S.md },
  statusTitle: { color: C.good, fontFamily: F.black, fontSize: 14 },
  statusText: { color: C.text, fontFamily: F.bold, fontSize: 14, marginTop: 1 },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: S.sm, backgroundColor: C.surface, padding: S.md, borderRadius: R.md, marginTop: S.md },
  errorText: { ...T.small, color: C.bad, flex: 1 },
  tools: { flexDirection: 'row', justifyContent: 'center', gap: S.md, marginTop: S.lg },
  tool: { flexDirection: 'row', alignItems: 'center', gap: S.sm, height: 50, paddingHorizontal: S.xl, borderRadius: 999, backgroundColor: C.blueGlass },
  toolOn: { backgroundColor: C.gold },
  toolText: { color: C.onBlue, fontFamily: F.bold, fontSize: 15 },
  compat: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, marginBottom: S.lg, ...SHADOW },
  card: { backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl, marginBottom: S.lg, ...SHADOW },
  cardTitle: { color: C.text, fontFamily: F.black, fontSize: 16, letterSpacing: -0.2 },
  cardSub: { ...T.small, color: C.muted, marginTop: 2 },
  demo: { backgroundColor: C.gold, borderRadius: R.xl, padding: S.xl, marginBottom: S.lg, ...GOLD_GLOW },
  demoLink: { color: C.text, fontFamily: F.black, fontSize: 12, letterSpacing: 0.6 },
  demoTitle: { color: C.text, fontFamily: F.display, fontSize: 21, letterSpacing: -0.5 },
  demoSub: { color: '#3B3200', fontFamily: F.semibold, fontSize: 13, marginTop: 2 },
  demoAmount: { color: C.blue, fontFamily: F.display, fontSize: 26, letterSpacing: -0.6 },
  demoAmountSub: { color: C.text, fontFamily: F.black, fontSize: 11, letterSpacing: 0.6 },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingHorizontal: S.sm, marginTop: S.sm },
  privacyText: { ...T.small, color: C.muted, flex: 1, fontSize: 12 },
});
