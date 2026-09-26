import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, F, R, S, T } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** Page shell: navy background with a soft glow at the top, scrollable body, optional sticky footer. */
export function Screen({
  children,
  footer,
  glow = true,
  tab = false,
}: {
  children: ReactNode;
  footer?: ReactNode;
  glow?: boolean;
  /** Inside the tab bar: the tab bar already handles the bottom safe area. */
  tab?: boolean;
}) {
  return (
    <View style={styles.root}>
      {glow ? (
        <LinearGradient
          colors={[C.bgGlow, C.bg]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.glow}
          pointerEvents="none"
        />
      ) : null}
      <SafeAreaView style={styles.safe} edges={tab ? ['top'] : ['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </View>
  );
}

export function SectionLabel({ children, style, right }: { children: ReactNode; style?: ViewStyle; right?: ReactNode }) {
  return (
    <View style={[styles.sectionLabel, style]}>
      <Text style={[T.label, { color: C.muted }]}>{children}</Text>
      {right}
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
  variant?: 'primary' | 'ghost' | 'subtle';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  const primary = variant === 'primary';
  const color = primary ? C.accentInk : C.text;
  const inner = loading ? (
    <ActivityIndicator color={color} />
  ) : (
    <View style={styles.buttonRow}>
      {icon ? <Ionicons name={icon} size={19} color={color} style={{ marginRight: S.sm }} /> : null}
      <Text style={[styles.buttonText, { color }]} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.buttonBase,
        primary && styles.buttonShadow,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {primary ? (
        <LinearGradient colors={[C.accent, C.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buttonFill}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={[styles.buttonFill, variant === 'ghost' ? styles.buttonGhost : styles.buttonSubtle]}>{inner}</View>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.8 }]}
    >
      {icon ? <Ionicons name={icon} size={15} color={selected ? C.accentInk : C.muted} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.chipText, selected && { color: C.accentInk }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string; icon?: IconName }[];
  value: V | undefined;
  onChange: (v: V) => void;
}) {
  return (
    <View style={styles.chipGroup}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} icon={o.icon} selected={value === o.value} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

export function Pill({ text, color, icon, filled }: { text: string; color: string; icon?: IconName; filled?: string }) {
  return (
    <View style={[styles.pill, { borderColor: filled ? 'transparent' : C.line, backgroundColor: filled }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
}

/** Top bar with a back button, used instead of the native header. */
export function BackBar({ onBack, title, right }: { onBack: () => void; title?: string; right?: ReactNode }) {
  return (
    <View style={styles.backBar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={12} onPress={onBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={22} color={C.text} />
      </Pressable>
      {title ? (
        <Text style={[T.label, { color: C.muted, flex: 1 }]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right}
    </View>
  );
}

/** Large page title used at the top of each tab. */
export function PageHeader({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <View style={styles.pageHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.pageTitle}>{title}</Text>
        {sub ? <Text style={styles.pageSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/** Pill-shaped segmented control. */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(o.value);
            }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && { color: C.accentInk }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Small statistic tile: label, big value, caption. */
export function StatTile({ label, value, caption, color = C.text, icon }: { label: string; value: string; caption?: string; color?: string; icon?: IconName }) {
  return (
    <View style={styles.stat}>
      <Text style={[T.label, { color: C.muted, fontSize: 10 }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {caption ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          {icon ? <Ionicons name={icon} size={12} color={C.muted} /> : null}
          <Text style={styles.statCaption} numberOfLines={1}>
            {caption}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Icon in a tinted rounded square. */
export function IconBadge({ name, color = C.accent, bg = C.accentSoft, size = 20 }: { name: IconName; color?: string; bg?: string; size?: number }) {
  return (
    <View style={[styles.iconBadge, { backgroundColor: bg, width: size + 20, height: size + 20 }]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 360 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: S.xl, paddingTop: S.md, paddingBottom: 56 },
  footer: {
    paddingHorizontal: S.xl,
    paddingTop: S.md,
    paddingBottom: S.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.line,
    backgroundColor: C.bg,
  },
  sectionLabel: { marginTop: S.xl, marginBottom: S.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: S.xl, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  buttonBase: { borderRadius: R.md },
  buttonShadow: { shadowColor: C.accent, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  buttonFill: { height: 56, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.xl },
  buttonGhost: { borderWidth: 1, borderColor: C.line, backgroundColor: 'transparent' },
  buttonSubtle: { backgroundColor: C.surfaceHi },
  buttonRow: { flexDirection: 'row', alignItems: 'center' },
  buttonText: { fontFamily: F.bold, fontSize: 16.5 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  chipSelected: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { color: C.text, fontSize: 14, fontFamily: F.semibold },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  pillText: { fontSize: 12, fontFamily: F.semibold, letterSpacing: 0.2 },
  backBar: { flexDirection: 'row', alignItems: 'center', marginBottom: S.lg, gap: S.md },
  backButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: S.md, marginTop: S.sm, marginBottom: S.lg },
  pageTitle: { ...T.h1, color: C.text, fontSize: 32, lineHeight: 38 },
  pageSub: { ...T.body, color: C.muted, marginTop: 2 },
  segmented: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 999, padding: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  segment: { flex: 1, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segmentActive: { backgroundColor: C.accent },
  segmentText: { color: C.muted, fontFamily: F.bold, fontSize: 13 },
  stat: { flex: 1, backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  statValue: { fontFamily: F.display, fontSize: 26, marginTop: 6 },
  statCaption: { ...T.small, color: C.muted, fontSize: 12, flexShrink: 1 },
  iconBadge: { borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
