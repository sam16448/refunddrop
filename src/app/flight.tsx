import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { RouteArc } from '@/components/RouteArc';
import { BackBar, Button, Card, Pill, Screen } from '@/components/ui';
import { localDate, localTime } from '@/lib/format';
import { formatDuration, greatCircleKm, minutesBetween } from '@/rules';
import { useClaim } from '@/state/claim';
import { C, S, T } from '@/theme';

export default function FlightScreen() {
  const { facts, source } = useClaim();
  if (!facts) return <Redirect href="/" />;

  const arrDelay =
    facts.actualArrivalUtc !== undefined ? minutesBetween(facts.scheduledArrivalUtc, facts.actualArrivalUtc) : undefined;
  const km = Math.round(greatCircleKm(facts.origin, facts.destination));

  let statusText: string;
  let statusColor: string;
  if (facts.status === 'cancelled') {
    statusText = 'Cancelled';
    statusColor = C.bad;
  } else if (arrDelay === undefined) {
    statusText = facts.status === 'scheduled' ? 'Not landed yet' : 'Arrival time unknown';
    statusColor = C.info;
  } else if (arrDelay >= 15) {
    statusText = `Arrived ${formatDuration(arrDelay)} late`;
    statusColor = arrDelay >= 180 ? C.accent : C.text;
  } else {
    statusText = 'Arrived on time';
    statusColor = C.good;
  }

  return (
    <Screen footer={<Button title="Continue" onPress={() => router.push('/questions')} />}>
      <BackBar onBack={() => router.back()} title={source === 'sample' ? 'Sample flight' : 'Live flight data'} />

      <Card>
        <View style={styles.topRow}>
          <Text style={styles.flightNo}>{facts.flightNumber}</Text>
          <Text style={styles.date}>{localDate(facts.scheduledDepartureUtc, facts.origin.tz)}</Text>
        </View>
        <View style={{ marginTop: S.lg }}>
          <RouteArc origin={facts.origin} destination={facts.destination} />
        </View>

        <View style={styles.times}>
          <View>
            <Text style={styles.timeLabel}>Scheduled arrival</Text>
            <Text style={styles.time}>{localTime(facts.scheduledArrivalUtc, facts.destination.tz)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.timeLabel}>{facts.status === 'cancelled' ? 'Actual arrival' : 'Actual arrival'}</Text>
            <Text style={[styles.time, arrDelay !== undefined && arrDelay >= 180 && { color: C.accent }]}>
              {facts.status === 'cancelled' ? '—' : localTime(facts.actualArrivalUtc, facts.destination.tz)}
            </Text>
          </View>
        </View>
      </Card>

      <Text style={[styles.status, { color: statusColor }]}>{statusText}</Text>

      <View style={styles.metaRow}>
        <Pill text={`Operated by ${facts.operatingCarrier.name}`} color={C.muted} />
        <Pill text={`${km.toLocaleString('en-US')} km`} color={C.muted} />
      </View>
      {facts.marketedAs?.length ? (
        <Text style={styles.note}>Also sold as {facts.marketedAs.join(', ')}. Claims go to the operating airline.</Text>
      ) : null}
      <Text style={styles.note}>
        Times shown in local airport time. Next, a few quick questions about what happened to you.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flightNo: { color: C.text, fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  date: { color: C.muted, fontSize: 15, fontWeight: '600' },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: S.lg, paddingTop: S.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  timeLabel: { ...T.label, color: C.muted, fontSize: 11 },
  time: { color: C.text, fontSize: 26, fontWeight: '800', marginTop: 4 },
  status: { ...T.h1, marginTop: S.xl },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginTop: S.md },
  note: { ...T.small, color: C.muted, marginTop: S.md },
});
