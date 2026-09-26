import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Letter } from '@/claim/letters';
import { copyLetter, shareLetter, shareLetterPdf } from '@/lib/share';
import { C, F, R, S, SHADOW, T } from '@/theme';

function Action({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={18} color={C.blue} />
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
  paper: { backgroundColor: C.paper, borderRadius: R.xl, padding: S.xl, borderTopWidth: 5, borderTopColor: C.gold, ...SHADOW },
  to: { color: '#6B6457', fontSize: 12, marginBottom: S.sm, fontFamily: F.medium },
  subject: { color: C.paperInk, fontSize: 15, fontFamily: F.bold, marginBottom: S.md, lineHeight: 21 },
  body: { color: C.paperInk, ...T.small, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: S.sm, marginTop: S.md },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: 999,
    backgroundColor: C.surface,
    ...SHADOW,
  },
  actionText: { color: C.blue, fontFamily: F.bold, fontSize: 14 },
});
