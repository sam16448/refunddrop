import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import type { FlightFacts } from '@/rules';
import {
  PURCHASE_MODE,
  buy,
  claimKitTransactions,
  configurePurchases,
  currentCustomerInfo,
  isClaimKitPackage,
  isPro,
  loadPackages,
  onCustomerInfo,
  restore,
  type PurchaseMode,
} from '@/services/purchases';

const SPENT_KEY = 'refunddrop.kitCredits.v1';
const LOCAL_PRO_KEY = 'refunddrop.localPro.v1';

export function flightKey(f: Pick<FlightFacts, 'flightNumber' | 'date'>): string {
  return `${f.flightNumber.replace(/\s+/g, '').toUpperCase()}|${f.date}`;
}

/** A plan shown on the paywall. `pkg` is present only when RevenueCat is live. */
export interface PlanOption {
  id: string;
  kind: 'kit' | 'annual';
  priceString: string;
  pkg?: PurchasesPackage;
}

/** Prices shown in Expo Go / demo mode, matching the RevenueCat products. */
const PREVIEW_PLANS: PlanOption[] = [
  { id: 'preview_kit', kind: 'kit', priceString: '$4.99' },
  { id: 'preview_annual', kind: 'annual', priceString: '$19.99' },
];

interface EntitlementsState {
  ready: boolean;
  mode: PurchaseMode;
  pro: boolean;
  plans: PlanOption[];
  /** Unspent Claim Kit purchases */
  credits: number;
  isUnlocked: (key: string) => boolean;
  /** Spend a credit on a flight. Returns false if none are available. */
  unlock: (key: string) => boolean;
  purchase: (plan: PlanOption, forFlight: string) => Promise<'unlocked' | 'cancelled' | 'error'>;
  restorePurchases: () => Promise<boolean>;
}

const Ctx = createContext<EntitlementsState | null>(null);

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(PURCHASE_MODE !== 'live');
  const [info, setInfo] = useState<CustomerInfo>();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  /** flightKey → transaction id ("preview-…" outside live mode) */
  const [spent, setSpent] = useState<Record<string, string>>({});
  /** Frequent Flyer unlocked in preview / demo mode */
  const [localPro, setLocalPro] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SPENT_KEY)
      .then((raw) => raw && setSpent(JSON.parse(raw)))
      .catch(() => {});
    AsyncStorage.getItem(LOCAL_PRO_KEY)
      .then((v) => setLocalPro(v === '1'))
      .catch(() => {});

    if (!configurePurchases()) {
      if (PURCHASE_MODE === 'live') queueMicrotask(() => setReady(true));
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

  const pro = PURCHASE_MODE === 'live' ? isPro(info) : localPro;
  const txns = useMemo(() => claimKitTransactions(info), [info]);
  const used = useMemo(() => new Set(Object.values(spent)), [spent]);
  const free = txns.filter((t) => !used.has(t));

  const plans = useMemo<PlanOption[]>(
    () =>
      PURCHASE_MODE === 'live'
        ? packages.map((p) => ({
            id: p.identifier,
            kind: isClaimKitPackage(p) ? 'kit' : 'annual',
            priceString: p.product.priceString,
            pkg: p,
          }))
        : PREVIEW_PLANS,
    [packages],
  );

  const isUnlocked = useCallback((key: string) => pro || Boolean(spent[key]), [pro, spent]);

  const assign = useCallback(
    (key: string, available: string[]) => {
      if (spent[key]) return true;
      const credit = available[0];
      if (!credit) return false;
      saveSpent({ ...spent, [key]: credit });
      return true;
    },
    [spent, saveSpent],
  );

  const purchase = useCallback<EntitlementsState['purchase']>(
    async (plan, forFlight) => {
      if (PURCHASE_MODE !== 'live' || !plan.pkg) {
        // Expo Go / demo: no store available, unlock locally.
        if (plan.kind === 'annual') {
          setLocalPro(true);
          AsyncStorage.setItem(LOCAL_PRO_KEY, '1').catch(() => {});
          return 'unlocked';
        }
        return assign(forFlight, [`preview-${Date.now()}`]) ? 'unlocked' : 'error';
      }
      const result = await buy(plan.pkg);
      if (!result.ok) return result.cancelled ? 'cancelled' : 'error';
      setInfo(result.info);
      if (isPro(result.info)) return 'unlocked';
      if (plan.kind === 'kit') {
        const fresh = claimKitTransactions(result.info).filter((t) => !used.has(t));
        return assign(forFlight, fresh) ? 'unlocked' : 'error';
      }
      return 'error';
    },
    [assign, used],
  );

  const restorePurchases = useCallback(async () => {
    if (PURCHASE_MODE !== 'live') return false;
    const ci = await restore();
    if (ci) setInfo(ci);
    return Boolean(ci);
  }, []);

  const value = useMemo<EntitlementsState>(
    () => ({
      ready,
      mode: PURCHASE_MODE,
      pro,
      plans,
      credits: free.length,
      isUnlocked,
      unlock: (key) => assign(key, free),
      purchase,
      restorePurchases,
    }),
    [ready, pro, plans, free, isUnlocked, assign, purchase, restorePurchases],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlements(): EntitlementsState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEntitlements must be used inside EntitlementsProvider');
  return ctx;
}
