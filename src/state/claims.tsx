import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ClaimDetails } from '@/claim/letters';
import type { FlightFacts, Outcome, PassengerAnswers, RegimeId } from '@/rules';
import type { Experience } from '@/state/claim';

export type ClaimStatus = 'drafted' | 'sent' | 'replied' | 'paid' | 'rejected';

export interface SavedClaim {
  id: string;
  createdAt: string;
  facts: FlightFacts;
  answers: PassengerAnswers;
  experience: Experience;
  details: ClaimDetails;
  summary: { regime: RegimeId; outcome: Outcome; amountText?: string };
  status: ClaimStatus;
  /** YYYY-MM-DD the claim letter was sent */
  sentOn?: string;
}

const KEY = 'refunddrop.claims.v1';

interface ClaimsState {
  claims: SavedClaim[];
  loaded: boolean;
  add: (c: Omit<SavedClaim, 'id' | 'createdAt' | 'status'>) => SavedClaim;
  update: (id: string, patch: Partial<SavedClaim>) => void;
  remove: (id: string) => void;
}

const ClaimsContext = createContext<ClaimsState | null>(null);

/** On-device claim tracker. Nothing leaves the phone. */
export function ClaimsProvider({ children }: { children: ReactNode }) {
  const [claims, setClaims] = useState<SavedClaim[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setClaims(JSON.parse(raw) as SavedClaim[]);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const persist = useCallback((next: SavedClaim[]) => {
    setClaims(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const add = useCallback<ClaimsState['add']>(
    (c) => {
      const saved: SavedClaim = {
        ...c,
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        status: 'drafted',
      };
      persist([saved, ...claims]);
      return saved;
    },
    [claims, persist],
  );

  const update = useCallback<ClaimsState['update']>(
    (id, patch) => persist(claims.map((c) => (c.id === id ? { ...c, ...patch } : c))),
    [claims, persist],
  );

  const remove = useCallback<ClaimsState['remove']>((id) => persist(claims.filter((c) => c.id !== id)), [claims, persist]);

  const value = useMemo(() => ({ claims, loaded, add, update, remove }), [claims, loaded, add, update, remove]);
  return <ClaimsContext.Provider value={value}>{children}</ClaimsContext.Provider>;
}

export function useClaims(): ClaimsState {
  const ctx = useContext(ClaimsContext);
  if (!ctx) throw new Error('useClaims must be used inside ClaimsProvider');
  return ctx;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
