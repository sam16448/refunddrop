import { Redirect, router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BackBar, Button, ChipGroup, Screen } from '@/components/ui';
import { determineScope, type DisruptionReason, type NoticeBucket, type PassengerAnswers } from '@/rules';
import { useClaim, type Experience } from '@/state/claim';
import { C, S, T } from '@/theme';

const REASONS: { value: DisruptionReason; label: string }[] = [
  { value: 'technical', label: 'Technical problem' },
  { value: 'crew_shortage', label: 'Crew shortage' },
  { value: 'operational', label: 'Late incoming plane' },
  { value: 'airline_staff_strike', label: 'Airline staff strike' },
  { value: 'weather', label: 'Bad weather' },
  { value: 'air_traffic_control', label: 'Air traffic control' },
  { value: 'third_party_strike', label: 'Airport / ATC strike' },
  { value: 'security', label: 'Security issue' },
  { value: 'unknown', label: "They didn't say" },
];

/** Buckets map to a representative minute value for the engine. */
const LATE_BUCKETS = [
  { value: '90', label: 'Under 2h' },
  { value: '150', label: '2–3h' },
  { value: '210', label: '3–4h' },
  { value: '300', label: '4h or more' },
];

const FINAL_DELAY_BUCKETS = [
  { value: '120', label: 'Under 3h' },
  { value: '210', label: '3–4h' },
  { value: '300', label: '4h or more' },
];

type YesNo = 'yes' | 'no';
const YES_NO: { value: YesNo; label: string }[] = [
  { value: 'no', label: 'No' },
  { value: 'yes', label: 'Yes' },
];

function Question({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.q}>
      <Text style={styles.qTitle}>{title}</Text>
      {hint ? <Text style={styles.qHint}>{hint}</Text> : null}
      <View style={{ marginTop: S.md }}>{children}</View>
    </View>
  );
}

export default function QuestionsScreen() {
  const { facts, answers, setAnswers, experience, setExperience } = useClaim();
  if (!facts) return <Redirect href="/" />;

  const scope = determineScope(facts);
  const european = Boolean(scope.rules);
  const update = (patch: Partial<PassengerAnswers>) => setAnswers({ ...answers, ...patch });
  const reroute = answers.reroute;
  const conn = answers.connection;
  const db = answers.deniedBoarding;

  const rerouteQuestions = (
    <>
      <Question title="Did you take a replacement flight?">
        <ChipGroup
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No, I took a refund' },
          ]}
          value={reroute === undefined ? undefined : reroute.took ? 'yes' : 'no'}
          onChange={(v) => update({ reroute: v === 'yes' ? { took: true, departedEarlyMinutes: 0 } : { took: false } })}
        />
      </Question>
      {reroute?.took ? (
        <Question title="How late did it get you there?" hint="Compared with your original arrival time.">
          <ChipGroup
            options={LATE_BUCKETS}
            value={reroute.arrivalDelayMinutes !== undefined ? String(reroute.arrivalDelayMinutes) : undefined}
            onChange={(v) => update({ reroute: { ...reroute, arrivalDelayMinutes: Number(v) } })}
          />
        </Question>
      ) : null}
    </>
  );

  const reasonQuestion = (
    <Question title="What reason did the airline give?" hint="Pick the closest. Unsure is fine — the claim letter asks them to confirm.">
      <ChipGroup options={REASONS} value={answers.reason} onChange={(v) => update({ reason: v })} />
    </Question>
  );

  return (
    <Screen footer={<Button title="See my result" onPress={() => router.push('/verdict')} />}>
      <BackBar onBack={() => router.back()} title={`${facts.flightNumber} · ${facts.origin.iata} → ${facts.destination.iata}`} />
      <Text style={styles.title}>A few quick questions</Text>
      <Text style={styles.sub}>Only things the flight data can't tell us.</Text>

      <Question title="What happened to you?">
        <ChipGroup<Experience>
          options={[
            { value: 'delay', label: 'Delayed' },
            { value: 'cancel', label: 'Cancelled' },
            { value: 'denied', label: 'Refused boarding' },
          ]}
          value={experience}
          onChange={setExperience}
        />
      </Question>

      {!european && scope.usRefundApplies ? (
        <Question title="Did you still fly?" hint="US refunds apply only if you chose not to travel.">
          <ChipGroup<YesNo>
            options={[
              { value: 'no', label: 'No, I cancelled my trip' },
              { value: 'yes', label: 'Yes, I flew' },
            ]}
            value={answers.travelled === undefined ? undefined : answers.travelled ? 'yes' : 'no'}
            onChange={(v) => update({ travelled: v === 'yes' })}
          />
        </Question>
      ) : null}

      {european && experience === 'delay' ? (
        <>
          <Question title="Was this part of a longer trip on one booking?" hint="For example, a connection booked on the same ticket.">
            <ChipGroup<YesNo>
              options={YES_NO}
              value={conn === undefined ? undefined : conn.sameBooking ? 'yes' : 'no'}
              onChange={(v) => update({ connection: v === 'yes' ? { sameBooking: true } : undefined })}
            />
          </Question>
          {conn?.sameBooking ? (
            <Question title="How late did you reach your final destination?">
              <ChipGroup
                options={FINAL_DELAY_BUCKETS}
                value={conn.finalArrivalDelayMinutes !== undefined ? String(conn.finalArrivalDelayMinutes) : undefined}
                onChange={(v) => update({ connection: { ...conn, finalArrivalDelayMinutes: Number(v) } })}
              />
            </Question>
          ) : null}
          {reasonQuestion}
        </>
      ) : null}

      {european && experience === 'cancel' ? (
        <>
          <Question title="When did the airline tell you?" hint="Before your original departure time.">
            <ChipGroup<NoticeBucket>
              options={[
                { value: 'under7', label: 'Less than 7 days' },
                { value: '7to13', label: '7–13 days' },
                { value: '14plus', label: '14 days or more' },
              ]}
              value={answers.cancellationNotice}
              onChange={(v) => update({ cancellationNotice: v })}
            />
          </Question>
          {rerouteQuestions}
          {reasonQuestion}
        </>
      ) : null}

      {european && experience === 'denied' ? (
        <>
          <Question title="Did you volunteer to give up your seat?">
            <ChipGroup<YesNo>
              options={YES_NO}
              value={db?.voluntary === undefined ? undefined : db.voluntary ? 'yes' : 'no'}
              onChange={(v) => update({ deniedBoarding: { happened: true, ...db, voluntary: v === 'yes' } })}
            />
          </Question>
          <Question title="What reason were you given?">
            <ChipGroup
              options={[
                { value: 'overbooked', label: 'Flight overbooked' },
                { value: 'grounds', label: 'Documents, health or safety' },
              ]}
              value={db?.reasonableGrounds === undefined ? undefined : db.reasonableGrounds ? 'grounds' : 'overbooked'}
              onChange={(v) => update({ deniedBoarding: { happened: true, ...db, reasonableGrounds: v === 'grounds' } })}
            />
          </Question>
          {rerouteQuestions}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...T.h1, color: C.text },
  sub: { ...T.body, color: C.muted, marginTop: S.xs },
  q: { marginTop: S.xl },
  qTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  qHint: { ...T.small, color: C.muted, marginTop: 4 },
});
