import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import type { FlightFacts } from '@/rules';
import {
  API_KEY,
  buy,
  claimKitTransactions,
  configurePurchases,
  currentCustomerInfo,
  isClaimKitPackage,
  isPro,
  loadPackages,
  onCustomerInfo,
  restore,
} from '@/services/purchases';

const SPENT_KEY = 'refunddrop.kitCredits.v1';
/** Without a RevenueCat key (e.g. someone running the open-source repo) the kit unlocks in demo mode. */
export const DEMO_MODE = !API_KEY;

export function flightKey(f: Pick<FlightFacts, 'flightNumber' | 'date'>): string {
  return `${f.flightNumber.replace(/\s+/g, '').toUpperCase()}|${f.date}`;
}

interface EntitlementsState {
  ready: boolean;
  demo: boolean;
  pro: boolean;
  packages: PurchasesPackage[];
  /** Unspent Claim Kit purchases */
  credits: number;
  isUnlocked: (key: string) => boolean;
  /** Spend a credit on a flight. Returns false if none are available. */
  unlock: (key: string) => boolean;
  purchase: (pkg: PurchasesPackage, forFlight: string) => Promise<'unlocked' | 'cancelled' | 'error'>;
  restorePurchases: () => Promise<boolean>;
}

const Ctx = createContext<EntitlementsState | null>(null);

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(DEMO_MODE);
  const [info, setInfo] = useState<CustomerInfo>();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  /** flightKey → transaction id (or "demo") */
  const [spent, setSpent] = useState<Record<string, string>>({});

  useEffect(() => {
    AsyncStorage.getItem(SPENT_KEY)
      .then((raw) => raw && setSpent(JSON.parse(raw)))
      .catch(() => {});

    if (!configurePurchases()) {
      queueMicrotask(() => setReady(true));
      return;
    }
    const off = onCustomerInfo(setInfo);
    Promise.all([currentCustomerInfo(), loadPackages().catch(() => [] as PurchasesPackage[])])
      .then(([ci, pkgs]) => {
        if (ci) setInfo(ci);
        setPackages(pkgs);
      })
      .finally(() => setReady(true));
    return off;
  }, []);

  const saveSpent = useCallback((next: Record<string, string>) => {
    setSpent(next);
    AsyncStorage.setItem(SPENT_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const pro = isPro(info);
  const txns = useMemo(() => claimKitTransactions(info), [info]);
  const used = useMemo(() => new Set(Object.values(spent)), [spent]);
  const free = txns.filter((t) => !used.has(t));

  const isUnlocked = useCallback((key: string) => DEMO_MODE || pro || Boolean(spent[key]), [pro, spent]);

  const unlock = useCallback(
    (key: string, available: string[] = free) => {
      if (spent[key]) return true;
      const credit = available[0];
      if (!credit) return false;
      saveSpent({ ...spent, [key]: credit });
      return true;
    },
    [free, spent, saveSpent],
  );

  const purchase = useCallback<EntitlementsState['purchase']>(
    async (pkg, forFlight) => {
      const result = await buy(pkg);
      if (!result.ok) return result.cancelled ? 'cancelled' : 'error';
      setInfo(result.info);
      if (isPro(result.info)) return 'unlocked';
      if (isClaimKitPackage(pkg)) {
        const fresh = claimKitTransactions(result.info).filter((t) => !used.has(t));
        return unlock(forFlight, fresh) ? 'unlocked' : 'error';
      }
      return 'error';
    },
    [unlock, used],
  );

  const restorePurchases = useCallback(async () => {
    const ci = await restore();
    if (ci) setInfo(ci);
    return Boolean(ci);
  }, []);

  const value = useMemo<EntitlementsState>(
    () => ({
      ready,
      demo: DEMO_MODE,
      pro,
      packages,
      credits: free.length,
      isUnlocked,
      unlock: (key) => unlock(key),
      purchase,
      restorePurchases,
    }),
    [ready, pro, packages, free.length, isUnlocked, unlock, purchase, restorePurchases],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements(): EntitlementsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEntitlements must be used inside EntitlementsProvider');
  return ctx;
}
