import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Letter } from '@/claim/letters';
import { copyLetter, shareLetter, shareLetterPdf } from '@/lib/share';
import { C, R, S, T } from '@/theme';

function Action({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={18} color={C.text} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

/** A letter shown as paper, with copy / share / PDF actions. */
export function LetterView({ letter }: { letter: Letter }) {
  return (
    <View>
      <View style={styles.paper}>
        <Text style={styles.to}>To: {letter.to}</Text>
        <Text style={styles.subject} selectable>
          {letter.subject}
        </Text>
        <Text style={styles.body} selectable>
          {letter.body}
        </Text>
      </View>
      <View style={styles.actions}>
        <Action icon="copy-outline" label="Copy" onPress={() => copyLetter(letter)} />
        <Action icon="share-outline" label="Share" onPress={() => shareLetter(letter)} />
        <Action icon="document-outline" label="PDF" onPress={() => shareLetterPdf(letter)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { backgroundColor: '#F7F4EC', borderRadius: R.md, padding: S.lg },
  to: { color: '#6B6457', fontSize: 12, marginBottom: S.sm },
  subject: { color: '#1C1A16', fontSize: 15, fontWeight: '800', marginBottom: S.md },
  body: { color: '#1C1A16', ...T.small, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: S.sm, marginTop: S.md },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.surface,
  },
  actionText: { color: C.text, fontWeight: '700', fontSize: 14 },
});
