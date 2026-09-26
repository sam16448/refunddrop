import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BoardingPassCard } from '@/components/BoardingPassCard';
import { BackBar, Button, IconBadge, Screen } from '@/components/ui';
import { formatDuration, minutesBetween } from '@/rules';
import { useClaim } from '@/state/claim';
import { C, F, S, T } from '@/theme';

export default function FlightScreen() {
  const { facts, source, passenger } = useClaim();
  if (!facts) return <Redirect href="/" />;

  const arrDelay =
    facts.actualArrivalUtc !== undefined ? minutesBetween(facts.scheduledArrivalUtc, facts.actualArrivalUtc) : undefined;

  let headline: string;
  let color: string;
  let note: string;
  let label = 'Flight status';
  if (facts.status === 'cancelled') {
    headline = 'Your flight was cancelled';
    color = C.bad;
    label = 'Cancellation';
    note = 'Short-notice cancellations can earn compensation on top of a refund.';
  } else if (arrDelay === undefined) {
    headline = facts.status === 'scheduled' ? 'This flight hasn’t landed yet' : 'Arrival time unknown';
    color = C.info;
    note = 'You can still check — we’ll ask when you arrived.';
  } else if (arrDelay >= 180) {
    headline = `Arrived ${formatDuration(arrDelay)} late`;
    color = C.accent;
    label = 'Long delay';
    note = 'Over 3 hours late at arrival — this is where compensation can start.';
  } else if (arrDelay >= 15) {
    headline = `Arrived ${formatDuration(arrDelay)} late`;
    color = C.text;
    note = 'Under 3 hours at arrival, so EU/UK compensation is unlikely — but other rights may apply.';
  } else {
    headline = 'Arrived on time';
    color = C.good;
    note = 'Were you refused boarding or rebooked? Tell us on the next screen.';
  }

  return (
    <Screen footer={<Button title="Continue" icon="arrow-forward" onPress={() => router.push('/questions')} />}>
      <BackBar onBack={() => router.back()} title={`Step 1 of 3 · ${source === 'sample' ? 'Sample flight' : 'Live flight data'}`} />

      <Animated.View entering={FadeInDown.duration(450)} style={styles.headCard}>
        <View style={styles.labelRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.label, { color }]}>{label.toUpperCase()}</Text>
        </View>
        <Text style={[styles.headline, { color }]}>{headline}</Text>
        <Text style={styles.note}>{note}</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(500)} style={{ marginTop: S.xl }}>
        <BoardingPassCard facts={facts} />
      </Animated.View>

      {passenger ? (
        <Animated.View entering={FadeInDown.delay(220).duration(500)} style={styles.scanned}>
          <IconBadge name="person" size={16} color={C.good} bg={C.goodSoft} />
          <Text style={styles.scannedText}>
            Read from boarding pass: <Text style={{ fontFamily: F.bold, color: C.text }}>{passenger.name}</Text> · booking{' '}
            <Text style={{ fontFamily: F.bold, color: C.text }}>{passenger.bookingRef}</Text>
          </Text>
        </Animated.View>
      ) : null}

      {facts.marketedAs?.length ? (
        <Text style={styles.small}>
          Also sold as {facts.marketedAs.join(', ')}. Claims go to the operating airline, {facts.operatingCarrier.name}.
        </Text>
      ) : null}
      <Text style={styles.small}>Times are local airport time. Delay is measured when the doors open at arrival.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headCard: { backgroundColor: C.surface, borderRadius: 20, padding: S.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: S.sm },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { ...T.label, fontSize: 10.5 },
  headline: { ...T.h1, fontSize: 30, lineHeight: 36 },
  note: { ...T.body, color: C.muted, marginTop: S.sm },
  scanned: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.lg, backgroundColor: C.surface, padding: S.md, borderRadius: 14 },
  scannedText: { ...T.small, color: C.muted, flex: 1 },
  small: { ...T.small, color: C.faint, marginTop: S.md },
});
