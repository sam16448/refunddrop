import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, GOLD_GLOW, R, S, SHADOW, T } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const PAD_TOP = S.sm;

/**
 * Page shell. `header` sits on the electric-blue band at the top; the blue can run `overlap` px further so the
 * first card rides over it. `blue` paints the whole page blue (intro). Optional sticky `footer`.
 */
export function Screen({
  children,
  footer,
  tab = false,
  header,
  overlap = 0,
  blue = false,
}: {
  children: ReactNode;
  footer?: ReactNode;
  /** Inside the tab bar: the tab bar already handles the bottom safe area. */
  tab?: boolean;
  header?: ReactNode;
  overlap?: number;
  blue?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(0);
  const bottom = tab ? 0 : insets.bottom;
  return (
    <View style={[styles.root, blue && { backgroundColor: C.blue }]}>
      <View style={{ height: insets.top, backgroundColor: C.blue }} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: (footer ? S.xl : 56) + (footer ? 0 : bottom) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {header && !blue ? (
          <View
            pointerEvents="none"
            style={[styles.band, { height: 1000 + PAD_TOP + headerHeight + overlap }]}
          />
        ) : null}
        {header ? (
          <View style={styles.header} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
            {header}
          </View>
        ) : null}
        {children}
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, blue && styles.footerBlue, { paddingBottom: S.md + bottom }]}>{footer}</View>
      ) : null}
    </View>
  );
}

export function SectionLabel({ children, style, right }: { children: ReactNode; style?: ViewStyle; right?: ReactNode }) {
  return (
    <View style={[styles.sectionLabel, style]}>
      <Text style={[T.label, { color: C.text, flexShrink: 1 }]}>{children}</Text>
      {right}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  iconRight,
  trailing,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'gold' | 'ghost' | 'subtle' | 'white';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  iconRight?: IconName;
  /** Text shown at the right edge, e.g. a price. */
  trailing?: string;
}) {
  const color =
    variant === 'primary' ? C.onBlue : variant === 'gold' ? C.text : variant === 'white' ? C.blue : variant === 'ghost' ? C.blue : C.text;
  const fill: ViewStyle =
    variant === 'primary'
      ? styles.btnPrimary
      : variant === 'gold'
        ? styles.btnGold
        : variant === 'white'
          ? styles.btnWhite
          : variant === 'ghost'
            ? styles.btnGhost
            : styles.btnSubtle;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={trailing ? `${title}, ${trailing}` : title}
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        fill,
        (disabled || loading) && { opacity: 0.5 },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.btnRow}>
          {icon ? <Ionicons name={icon} size={19} color={color} style={{ marginRight: S.sm }} /> : null}
          <Text style={[styles.btnText, { color }, trailing ? { flex: 1 } : null]} numberOfLines={1}>
            {title}
          </Text>
          {trailing ? <Text style={[styles.btnText, { color, marginLeft: S.sm }]}>{trailing}</Text> : null}
          {iconRight ? <Ionicons name={iconRight} size={19} color={color} style={{ marginLeft: S.sm }} /> : null}
        </View>
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
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && { opacity: 0.85 }]}
    >
      {icon ? <Ionicons name={icon} size={15} color={selected ? C.onBlue : C.muted} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.chipText, selected && { color: C.onBlue }]}>{label}</Text>
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
    <View style={[styles.pill, { borderColor: filled ? 'transparent' : C.line, backgroundColor: filled ?? C.surface }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.pillText, { color }]}>{text}</Text>
    </View>
  );
}

/** Small uppercase badge, e.g. "STEP 1", "3 ACTIVE", "0% FEE". */
export function Tag({
  text,
  tone = 'blue',
  icon,
  style,
}: {
  text: string;
  tone?: 'blue' | 'gold' | 'green' | 'navy' | 'grey' | 'red' | 'glass' | 'white';
  icon?: IconName;
  style?: ViewStyle;
}) {
  const t = TAG[tone];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} style={{ marginRight: 5 }} /> : null}
      <Text style={[styles.tagText, { color: t.fg }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const TAG: Record<string, { bg: string; fg: string }> = {
  blue: { bg: C.accentSoft, fg: C.blue },
  gold: { bg: C.gold, fg: C.text },
  green: { bg: C.goodSoft, fg: C.good },
  navy: { bg: C.text, fg: C.gold },
  grey: { bg: C.surfaceHi, fg: C.muted },
  red: { bg: C.badSoft, fg: C.bad },
  glass: { bg: C.blueGlass, fg: C.onBlue },
  white: { bg: C.surface, fg: C.blue },
};

/** Round glass button for the blue header (back, share, help). */
export function HeaderButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={C.onBlue} />
    </Pressable>
  );
}

/** Top bar on the blue header: back button, title, optional right element. */
export function BackBar({ onBack, title, right, icon = 'arrow-back' }: { onBack: () => void; title?: string; right?: ReactNode; icon?: IconName }) {
  return (
    <View style={styles.backBar}>
      <HeaderButton icon={icon} label={icon === 'close' ? 'Close' : 'Back'} onPress={onBack} />
      {title ? (
        <Text style={styles.backTitle} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right}
    </View>
  );
}

/** Large page title on the blue header of each tab. */
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
  onBlue,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
  /** Sits on the blue header: glass track, white active pill. */
  onBlue?: boolean;
}) {
  return (
    <View style={[styles.segmented, onBlue && styles.segmentedBlue]} accessibilityRole="tablist">
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
            style={[styles.segment, active && (onBlue ? styles.segmentActiveBlue : styles.segmentActive)]}
          >
            <Text
              style={[styles.segmentText, onBlue && { color: C.onBlueMuted }, active && { color: onBlue ? C.blue : C.onBlue }]}
              numberOfLines={1}
            >
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

/** Icon in a tinted circle. */
export function IconBadge({ name, color = C.blue, bg = C.accentSoft, size = 20 }: { name: IconName; color?: string; bg?: string; size?: number }) {
  return (
    <View style={[styles.iconBadge, { backgroundColor: bg, width: size + 22, height: size + 22, borderRadius: (size + 22) / 2 }]}>
      <Ionicons name={name} size={size} color={color} />
    </View>
  );
}

/** RefundDrop wordmark: gold tile with an up-arrow, "Refund" in white and "Drop" in gold. */
export function Logo({ size = 40, sub, dark }: { size?: number; sub?: string; dark?: boolean }) {
  const word: TextStyle = { fontFamily: F.black, fontSize: size * 0.52, letterSpacing: -0.5 };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
      <LogoMark size={size} />
      <View>
        <Text style={word}>
          <Text style={{ color: dark ? C.text : C.onBlue }}>Refund</Text>
          <Text style={{ color: dark ? C.blue : C.gold }}>Drop</Text>
        </Text>
        {sub ? <Text style={[styles.logoSub, dark && { color: C.muted }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.logoTile, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <Ionicons name="arrow-up" size={size * 0.56} color={C.blueDeep} />
      <View style={[styles.logoDot, { width: size * 0.16, height: size * 0.16, borderRadius: size * 0.08, top: size * 0.14, right: size * 0.14 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: S.lg, paddingTop: PAD_TOP },
  band: { position: 'absolute', left: 0, right: 0, top: -1000, backgroundColor: C.blue },
  header: { paddingBottom: S.xl },
  footer: {
    paddingHorizontal: S.lg,
    paddingTop: S.md,
    backgroundColor: C.surface,
    gap: S.sm,
    shadowColor: '#092570',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  footerBlue: { backgroundColor: C.blue, shadowOpacity: 0 },
  sectionLabel: { marginTop: S.xl, marginBottom: S.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: S.md },
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: S.xl, ...SHADOW },
  btn: { minHeight: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: S.xl },
  btnPrimary: { backgroundColor: C.blue, shadowColor: C.blue, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  btnGold: { backgroundColor: C.gold, borderBottomWidth: 3, borderBottomColor: C.goldDeep, ...GOLD_GLOW },
  btnWhite: { backgroundColor: C.surface },
  btnGhost: { backgroundColor: C.surface, borderWidth: 1.5, borderColor: 'rgba(19,81,231,0.25)' },
  btnSubtle: { backgroundColor: C.surfaceHi },
  btnRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center' },
  btnText: { fontFamily: F.bold, fontSize: 16 },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  chipSelected: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { color: C.text, fontSize: 14, fontFamily: F.bold },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  pillText: { fontSize: 12, fontFamily: F.bold, letterSpacing: 0.2 },
  tag: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  tagText: { fontFamily: F.black, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase' },
  headerButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.blueGlass, alignItems: 'center', justifyContent: 'center' },
  backBar: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingTop: S.xs },
  backTitle: { flex: 1, color: C.onBlue, fontFamily: F.black, fontSize: 18, letterSpacing: -0.3 },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: S.md, paddingTop: S.sm, paddingBottom: S.xs },
  pageTitle: { fontFamily: F.display, color: C.onBlue, fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  pageSub: { ...T.body, color: C.onBlueMuted, marginTop: 2 },
  segmented: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 999, padding: 4, ...SHADOW },
  segmentedBlue: { backgroundColor: C.blueGlass, shadowOpacity: 0, elevation: 0 },
  segment: { flex: 1, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  segmentActive: { backgroundColor: C.blue },
  segmentActiveBlue: { backgroundColor: C.surface },
  segmentText: { color: C.muted, fontFamily: F.bold, fontSize: 13 },
  stat: { flex: 1, backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, ...SHADOW },
  statValue: { fontFamily: F.display, fontSize: 26, marginTop: 6, letterSpacing: -0.6 },
  statCaption: { ...T.small, color: C.muted, fontSize: 12, flexShrink: 1 },
  iconBadge: { alignItems: 'center', justifyContent: 'center' },
  logoTile: { backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  logoDot: { position: 'absolute', backgroundColor: '#10B981' },
  logoSub: { color: C.gold, fontFamily: F.black, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: -2 },
});
