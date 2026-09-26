import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { localDate, localTime } from '@/lib/format';
import { formatDuration, greatCircleKm, minutesBetween, type FlightFacts } from '@/rules';
import { C, F, R, S, T } from '@/theme';

/** Flight shown as a boarding pass: route on top, tear line, times on the stub. */
export function BoardingPassCard({ facts }: { facts: FlightFacts }) {
  const arrDelay =
    facts.actualArrivalUtc !== undefined ? minutesBetween(facts.scheduledArrivalUtc, facts.actualArrivalUtc) : undefined;
  const km = Math.round(greatCircleKm(facts.origin, facts.destination));
  const late = arrDelay !== undefined && arrDelay >= 180;

  return (
    <View style={styles.pass}>
      <View style={styles.top}>
        <View style={styles.row}>
          <Text style={styles.carrier} numberOfLines={1}>
            {facts.operatingCarrier.name}
          </Text>
          <Text style={styles.flightNo}>{facts.flightNumber}</Text>
        </View>

        <View style={[styles.row, { marginTop: S.lg, alignItems: 'flex-end' }]}>
          <View>
            <Text style={styles.code}>{facts.origin.iata}</Text>
            <Text style={styles.city} numberOfLines={1}>
              {facts.origin.city}
            </Text>
          </View>
          <View style={styles.arcWrap}>
            <Svg width="100%" height={34} viewBox="0 0 120 34" preserveAspectRatio="none">
              <Path d="M 4 30 Q 60 -8 116 30" stroke={C.line} strokeWidth={2} strokeDasharray="4 5" fill="none" />
            </Svg>
            <View style={styles.planeDot}>
              <Ionicons name="airplane" size={16} color={C.accentInk} />
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.code}>{facts.destination.iata}</Text>
            <Text style={styles.city} numberOfLines={1}>
              {facts.destination.city}
            </Text>
          </View>
        </View>

        <View style={[styles.row, { marginTop: S.lg }]}>
          <Meta label="Date" value={localDate(facts.scheduledDepartureUtc, facts.origin.tz)} />
          <Meta label="Departs" value={localTime(facts.scheduledDepartureUtc, facts.origin.tz)} />
          <Meta label="Distance" value={`${km.toLocaleString('en-US')} km`} align="right" />
        </View>
      </View>

      <View style={styles.tear}>
        <View style={[styles.notch, { left: -14 }]} />
        <View style={styles.dash} />
        <View style={[styles.notch, { right: -14 }]} />
      </View>

      <View style={styles.stub}>
        <Meta label="Scheduled arrival" value={localTime(facts.scheduledArrivalUtc, facts.destination.tz)} big />
        <Meta
          label={facts.status === 'cancelled' ? 'Status' : 'Actual arrival'}
          value={facts.status === 'cancelled' ? 'Cancelled' : localTime(facts.actualArrivalUtc, facts.destination.tz)}
          big
          align="right"
          color={facts.status === 'cancelled' ? C.bad : late ? C.accent : C.text}
        />
      </View>
      {arrDelay !== undefined && arrDelay > 0 && facts.status !== 'cancelled' ? (
        <View style={[styles.delayBar, { backgroundColor: late ? C.accentSoft : C.surfaceHi }]}>
          <Ionicons name="time" size={14} color={late ? C.accent : C.muted} />
          <Text style={[styles.delayText, { color: late ? C.accent : C.muted }]}>{formatDuration(arrDelay)} late at the gate</Text>
        </View>
      ) : null}
    </View>
  );
}

function Meta({
  label,
  value,
  align = 'left',
  big,
  color = C.text,
}: {
  label: string;
  value: string;
  align?: 'left' | 'right';
  big?: boolean;
  color?: string;
}) {
  return (
    <View style={{ alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={[big ? styles.metaBig : styles.metaValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pass: { backgroundColor: C.surface, borderRadius: R.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, overflow: 'hidden' },
  top: { padding: S.xl, paddingBottom: S.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  carrier: { ...T.label, color: C.muted, flex: 1 },
  flightNo: { fontFamily: F.display, color: C.text, fontSize: 16, letterSpacing: 0.5 },
  code: { fontFamily: F.display, color: C.text, fontSize: 44, letterSpacing: 1, lineHeight: 48 },
  city: { ...T.small, color: C.muted, maxWidth: 110 },
  arcWrap: { flex: 1, marginHorizontal: S.sm, marginBottom: 22, alignItems: 'center', justifyContent: 'center' },
  planeDot: {
    position: 'absolute',
    top: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: { ...T.label, fontSize: 10, color: C.faint },
  metaValue: { fontFamily: F.semibold, color: C.text, fontSize: 15, marginTop: 4 },
  metaBig: { fontFamily: F.display, fontSize: 28, marginTop: 2 },
  tear: { height: 28, justifyContent: 'center' },
  dash: { marginHorizontal: S.xl, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: C.line },
  notch: { position: 'absolute', top: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg },
  stub: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: S.xl, paddingTop: S.xs, paddingBottom: S.lg },
  delayBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: S.xl, paddingVertical: S.md },
  delayText: { fontFamily: F.bold, fontSize: 13 },
});
