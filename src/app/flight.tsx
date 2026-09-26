import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BoardingPassCard } from '@/components/BoardingPassCard';
import { BackBar, Button, IconBadge, Screen, Tag } from '@/components/ui';
import { formatDuration, minutesBetween } from '@/rules';
import { useClaim } from '@/state/claim';
import { C, F, R, S, SHADOW, T } from '@/theme';

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
    color = C.blue;
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
    <Screen
      overlap={44}
      footer={<Button title="Continue" iconRight="arrow-forward" onPress={() => router.push('/questions')} />}
      header={
        <View>
          <BackBar
            onBack={() => router.back()}
            title="Step 1 of 3"
            right={<Tag text={source === 'sample' ? 'Sample flight' : 'Live data'} tone="glass" icon={source === 'sample' ? 'flask-outline' : 'radio-outline'} />}
          />
          <Text style={styles.headerTitle}>Here’s what happened</Text>
        </View>
      }
    >

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
  headerTitle: { fontFamily: F.display, color: C.onBlue, fontSize: 28, letterSpacing: -0.8, marginTop: S.lg },
  headCard: { backgroundColor: C.surface, borderRadius: R.xl, padding: S.xl, ...SHADOW },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: S.sm },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { ...T.label, fontSize: 10.5 },
  headline: { ...T.h1, fontSize: 28, lineHeight: 34 },
  note: { ...T.body, color: C.muted, marginTop: S.sm },
  scanned: { flexDirection: 'row', alignItems: 'center', gap: S.md, marginTop: S.lg, backgroundColor: C.surface, padding: S.md, borderRadius: R.lg, ...SHADOW },
  scannedText: { ...T.small, color: C.muted, flex: 1 },
  small: { ...T.small, color: C.faint, marginTop: S.md },
});
