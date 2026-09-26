import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Chip } from '@/components/ui';
import { C, F, R, S } from '@/theme';

function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoOf(d);
}

function pretty(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** Departure date: quick chips for recent days plus a native calendar. Value is YYYY-MM-DD. */
export function DateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(new Date(`${value}T12:00:00`));
  const today = daysAgo(0);
  const yesterday = daysAgo(1);
  const twoDays = daysAgo(2);
  const custom = value !== today && value !== yesterday && value !== twoDays;

  const openCalendar = () => {
    const current = new Date(`${value}T12:00:00`);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        maximumDate: new Date(),
        onChange: (e: DateTimePickerEvent, d?: Date) => {
          if (e.type === 'set' && d) onChange(isoOf(d));
        },
      });
    } else {
      setDraft(current);
      setIosOpen(true);
    }
  };

  return (
    <View>
      <View style={styles.chips}>
        <Chip label="Today" selected={value === today} onPress={() => onChange(today)} />
        <Chip label="Yesterday" selected={value === yesterday} onPress={() => onChange(yesterday)} />
        <Chip label="2 days ago" selected={value === twoDays} onPress={() => onChange(twoDays)} />
        <Chip label={custom ? 'Other ✓' : 'Other…'} icon="calendar-outline" selected={custom} onPress={openCalendar} />
      </View>
      <Pressable onPress={openCalendar} style={styles.display} accessibilityRole="button" accessibilityLabel="Choose date">
        <Ionicons name="calendar-outline" size={19} color={C.muted} />
        <Text style={[styles.displayText, { flex: 1 }]}>{pretty(value)}</Text>
        <Ionicons name="chevron-down" size={18} color={C.faint} />
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setIosOpen(false)} />
          <View style={styles.sheet}>
            <DateTimePicker
              value={draft}
              mode="date"
              display="inline"
              maximumDate={new Date()}
              themeVariant="light"
              accentColor={C.accent}
              onChange={(_e, d) => d && setDraft(d)}
            />
            <Button
              title="Use this date"
              onPress={() => {
                onChange(isoOf(draft));
                setIosOpen(false);
              }}
            />
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  display: {
    marginTop: S.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    backgroundColor: C.bg,
    borderRadius: R.md,
    paddingHorizontal: S.lg,
    height: 56,
  },
  displayText: { color: C.text, fontFamily: F.bold, fontSize: 16 },
  backdrop: { flex: 1, backgroundColor: 'rgba(9,37,112,0.45)' },
  sheet: { backgroundColor: C.surface, padding: S.lg, paddingBottom: 40, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, gap: S.md },
});
