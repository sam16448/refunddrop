import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { Airport } from '@/rules';
import { C } from '@/theme';

/** Origin → destination header with a dashed great-circle-style arc between the codes. */
export function RouteArc({ origin, destination }: { origin: Airport; destination: Airport }) {
  return (
    <View>
      <View style={styles.row}>
        <View>
          <Text style={styles.code}>{origin.iata}</Text>
          <Text style={styles.city}>{origin.city}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.code}>{destination.iata}</Text>
          <Text style={styles.city}>{destination.city}</Text>
        </View>
      </View>
      <Svg width="100%" height={56} viewBox="0 0 300 56" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="arc" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={C.muted} stopOpacity="0.6" />
            <Stop offset="1" stopColor={C.accent} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Path d="M 8 48 Q 150 -12 292 48" stroke="url(#arc)" strokeWidth={2.5} strokeDasharray="6 6" fill="none" />
        <Circle cx={8} cy={48} r={5} fill={C.muted} />
        <Circle cx={292} cy={48} r={5} fill={C.accent} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  code: { color: C.text, fontSize: 40, fontWeight: '800', letterSpacing: 1 },
  city: { color: C.muted, fontSize: 14, marginTop: 2 },
});
