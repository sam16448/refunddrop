import type { FlightFacts, PassengerAnswers } from '@/rules';
import type { Experience } from '@/state/claim';

/** Apply what the passenger reported on top of the API facts. */
export function effectiveFacts(facts: FlightFacts, experience: Experience): FlightFacts {
  if (experience === 'cancel' && facts.status !== 'cancelled') {
    return { ...facts, status: 'cancelled', actualArrivalUtc: undefined, actualDepartureUtc: undefined };
  }
  if (experience !== 'cancel' && facts.status === 'cancelled') {
    return { ...facts, status: 'unknown' };
  }
  return facts;
}

export function answersFor(experience: Experience, answers: PassengerAnswers): PassengerAnswers {
  if (experience === 'denied') {
    return { ...answers, deniedBoarding: { happened: true, ...answers.deniedBoarding } };
  }
  const { deniedBoarding: _ignored, ...rest } = answers;
  return rest;
}
