import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { LetterView } from '@/components/LetterView';
import { BackBar, Screen } from '@/components/ui';
import { buildClaimLetter, buildEscalationLetter, buildFollowUpLetter, type Letter } from '@/claim/letters';
import { evaluate } from '@/rules';
import { todayIso, useClaims } from '@/state/claims';
import { C, S, T } from '@/theme';

const TITLES: Record<Letter['kind'], string> = {
  claim: 'Claim letter',
  followup: 'Follow-up letter',
  escalation: 'Escalation letter',
};

export default function LetterScreen() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind: Letter['kind'] }>();
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

  return (
    <Screen>
      <BackBar onBack={() => router.back()} title={TITLES[letter.kind]} />
      {letter.kind === 'escalation' ? (
        <Text style={styles.note}>
          Send this with copies of your booking, your claim, the follow-up and any reply. Enforcement bodies can push the
          airline to pay.
        </Text>
      ) : null}
      <LetterView letter={letter} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { ...T.small, color: C.muted, marginBottom: S.md },
});
