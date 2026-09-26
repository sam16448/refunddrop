import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LetterView } from '@/components/LetterView';
import { BackBar, Button, Screen, Segmented } from '@/components/ui';
import { buildClaimLetter, buildEscalationLetter, buildFollowUpLetter, enforcementBody, type Letter } from '@/claim/letters';
import { evaluate } from '@/rules';
import { todayIso, useClaims } from '@/state/claims';
import { C, F, R, S, T } from '@/theme';

type Kind = Letter['kind'];

const NOTES: Record<Kind, { icon: keyof typeof Ionicons.glyphMap; text: string }> = {
  claim: { icon: 'paper-plane-outline', text: 'Send this through the airline’s claim form or customer relations email. Attach your booking and boarding pass.' },
  followup: { icon: 'repeat-outline', text: 'Send this if the airline hasn’t replied 14 days after your claim. It sets a clear deadline.' },
  escalation: { icon: 'megaphone-outline', text: 'Send this to the enforcement body with copies of your booking, claim, follow-up and any reply. It’s free.' },
};

export default function LetterScreen() {
  const { id, kind = 'claim' } = useLocalSearchParams<{ id: string; kind?: Kind }>();
  const { claims, loaded } = useClaims();
  const claim = claims.find((c) => c.id === id);
  if (!loaded) return null;
  if (!claim) return <Redirect href="/claims" />;

  const verdict = evaluate(claim.facts, claim.answers);
  const sentOn = claim.sentOn ?? todayIso();
  const letter =
    kind === 'followup'
      ? buildFollowUpLetter(verdict, claim.facts, claim.details, sentOn)
      : kind === 'escalation'
        ? buildEscalationLetter(verdict, claim.facts, claim.details, sentOn)
        : buildClaimLetter(verdict, claim.facts, claim.answers, claim.details);
  const carrier = claim.facts.operatingCarrier;
  const note = NOTES[letter.kind];

  return (
    <Screen
      footer={
        letter.kind === 'claim' ? (
          <Button
            title={carrier.claimUrl ? `Open ${carrier.name} claim page` : `Find ${carrier.name}’s claim form`}
            icon="open-outline"
            variant="ghost"
            onPress={() =>
              Linking.openURL(
                carrier.claimUrl ?? `https://www.google.com/search?q=${encodeURIComponent(`${carrier.name} compensation claim form`)}`,
              ).catch(() => {})
            }
          />
        ) : undefined
      }
      header={
        <View>
          <BackBar onBack={() => router.back()} title={`${claim.facts.flightNumber} · ${claim.facts.origin.iata} → ${claim.facts.destination.iata}`} />
          <Text style={styles.title}>Your letters</Text>
          <View style={{ marginTop: S.lg }}>
            <Segmented
              onBlue
              options={[
            { value: 'claim', label: 'Claim' },
            { value: 'followup', label: 'Follow-up' },
                { value: 'escalation', label: 'Escalation' },
              ]}
              value={letter.kind}
              onChange={(k) => router.setParams({ kind: k })}
            />
          </View>
        </View>
      }
    >

      <Animated.View key={letter.kind} entering={FadeIn.duration(250)}>
        <View style={styles.note}>
          <Ionicons name={note.icon} size={16} color={C.info} />
          <Text style={styles.noteText}>
            {note.text}
            {letter.kind === 'escalation' ? (
              <Text style={{ fontFamily: F.bold, color: C.text }}>{`\nSend to: ${enforcementBody(verdict, claim.facts)}`}</Text>
            ) : null}
          </Text>
        </View>
        <LetterView letter={letter} />
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...T.h1, color: C.onBlue, marginTop: S.lg },
  note: { flexDirection: 'row', gap: S.sm, alignItems: 'flex-start', backgroundColor: C.infoSoft, padding: S.md, borderRadius: R.md, marginBottom: S.lg },
  noteText: { ...T.small, color: C.info, flex: 1 },
});
