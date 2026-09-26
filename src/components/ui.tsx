import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, R, S, T } from '@/theme';

export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function SectionLabel({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ marginTop: S.xl, marginBottom: S.sm }, style]}>
      <Text style={[T.label, { color: C.muted }]}>{children}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const primary = variant === 'primary';
  const color = primary ? C.accentInk : C.text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonGhost,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.buttonRow}>
          {icon ? <Ionicons name={icon} size={18} color={color} style={{ marginRight: S.sm }} /> : null}
          <Text style={[styles.buttonText, { color }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && { color: C.accentInk }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value: V | undefined;
  onChange: (v: V) => void;
}) {
  return (
    <View style={styles.chipGroup}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

export function Pill({ text, color }: { text: string; color: string }) {
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: S.xl, paddingBottom: 48 },
  footer: { paddingHorizontal: S.xl, paddingTop: S.md, paddingBottom: S.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, backgroundColor: C.bg },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: S.xl },
  button: { height: 56, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.xl },
  buttonPrimary: { backgroundColor: C.accent },
  buttonGhost: { borderWidth: 1, borderColor: C.line },
  buttonRow: { flexDirection: 'row', alignItems: 'center' },
  buttonText: { fontSize: 17, fontWeight: '700' },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
  chipSelected: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.text, fontSize: 14, fontWeight: '600' },
  pill: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  pillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});

/** Top bar with a back button, used instead of the native header. */
export function BackBar({ onBack, title }: { onBack: () => void; title?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: S.lg, marginTop: -S.sm }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={onBack} style={{ paddingRight: S.md }}>
        <Ionicons name="chevron-back" size={26} color={C.text} />
      </Pressable>
      {title ? <Text style={[T.label, { color: C.muted }]}>{title}</Text> : null}
    </View>
  );
}
