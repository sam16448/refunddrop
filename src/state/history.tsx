import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FlightFacts, Outcome, PassengerAnswers } from '@/rules';
import type { Experience, FlightSource, ScannedPassenger } from '@/state/claim';
import { flightKey } from '@/state/entitlements';

/** A flight the user checked, so they can reopen the result later. Stored only on the phone. */
export interface RecentCheck {
  key: string;
  facts: FlightFacts;
  source: FlightSource;
  answers: PassengerAnswers;
  experience: Experience;
  passenger?: ScannedPassenger;
  outcome: Outcome;
  amountText?: string;
  checkedAt: string;
}

const KEY = 'refunddrop.history.v1';
const MAX = 6;

interface HistoryState {
  recent: RecentCheck[];
  record: (c: Omit<RecentCheck, 'key' | 'checkedAt'>) => void;
  clear: () => void;
}

const Ctx = createContext<HistoryState | null>(null);

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [recent, setRecent] = useState<RecentCheck[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setRecent(JSON.parse(raw) as RecentCheck[]))
      .catch(() => {});
  }, []);

  const persist = useCallback((fn: (prev: RecentCheck[]) => RecentCheck[]) => {
    setRecent((prev) => {
      const next = fn(prev);
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const record = useCallback<HistoryState['record']>(
    (c) => {
      const key = flightKey(c.facts);
      persist((prev) => [{ ...c, key, checkedAt: new Date().toISOString() }, ...prev.filter((r) => r.key !== key)].slice(0, MAX));
    },
    [persist],
  );

  const clear = useCallback(() => persist(() => []), [persist]);

  const value = useMemo(() => ({ recent, record, clear }), [recent, record, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useHistory(): HistoryState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useHistory must be used inside HistoryProvider');
  return ctx;
}
