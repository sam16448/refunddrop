import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { FlightFacts, PassengerAnswers } from '@/rules';

export type FlightSource = 'sample' | 'live';

/** What the passenger says happened, which can differ from the API status (e.g. denied boarding). */
export type Experience = 'delay' | 'cancel' | 'denied';

/** Details read from a scanned boarding pass, used to prefill the Claim Kit. */
export interface ScannedPassenger {
  name: string;
  bookingRef: string;
}

interface ClaimState {
  facts?: FlightFacts;
  passenger?: ScannedPassenger;
  setPassenger: (p?: ScannedPassenger) => void;
  source?: FlightSource;
  answers: PassengerAnswers;
  experience: Experience;
  setExperience: (e: Experience) => void;
  setFlight: (facts: FlightFacts, source: FlightSource, presetAnswers?: PassengerAnswers) => void;
  setAnswers: (answers: PassengerAnswers) => void;
  reset: () => void;
}

const ClaimContext = createContext<ClaimState | null>(null);

/** Holds the flight being checked and the passenger's answers for the current flow. */
export function ClaimProvider({ children }: { children: ReactNode }) {
  const [facts, setFacts] = useState<FlightFacts>();
  const [source, setSource] = useState<FlightSource>();
  const [answers, setAnswers] = useState<PassengerAnswers>({});
  const [experience, setExperience] = useState<Experience>('delay');
  const [passenger, setPassenger] = useState<ScannedPassenger>();

  const value = useMemo<ClaimState>(
    () => ({
      facts,
      passenger,
      setPassenger,
      source,
      answers,
      experience,
      setExperience,
      setFlight: (f, s, preset) => {
        setFacts(f);
        setExperience(f.status === 'cancelled' ? 'cancel' : 'delay');
        setSource(s);
        setAnswers(preset ?? { wasOnFlight: true });
      },
      setAnswers,
      reset: () => {
        setFacts(undefined);
        setPassenger(undefined);
        setSource(undefined);
        setAnswers({});
        setExperience('delay');
      },
    }),
    [facts, passenger, source, answers, experience],
  );

  return <ClaimContext.Provider value={value}>{children}</ClaimContext.Provider>;
}

export function useClaim(): ClaimState {
  const ctx = useContext(ClaimContext);
  if (!ctx) throw new Error('useClaim must be used inside ClaimProvider');
  return ctx;
}
