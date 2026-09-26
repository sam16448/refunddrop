/**
 * RevenueCat integration.
 *
 * Monetization model:
 *  - "claim_kit" (one-time, $4.99): unlocks the Claim Kit for ONE flight.
 *    Each purchase is a credit. Credits are derived from RevenueCat's
 *    non-subscription transactions, so they survive reinstalls via Restore.
 *  - "frequent_flyer_annual" ($19.99/yr): grants the "pro" entitlement,
 *    which unlocks every flight.
 *
 * Which flight a credit was spent on is remembered on-device.
 */

import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

export const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ?? '';
export const PRO_ENTITLEMENT = 'pro';
export const CLAIM_KIT_PRODUCT = 'claim_kit';

let configured = false;

export function configurePurchases(): boolean {
  if (configured) return true;
  if (!API_KEY) return false;
  try {
    Purchases.setLogLevel(LOG_LEVEL.WARN).catch(() => {});
    Purchases.configure({ apiKey: API_KEY });
    configured = true;
  } catch {
    configured = false;
  }
  return configured;
}

export function isPro(info: CustomerInfo | undefined): boolean {
  return Boolean(info?.entitlements.active[PRO_ENTITLEMENT]);
}

/** Transaction ids of every Claim Kit ever bought by this customer. */
export function claimKitTransactions(info: CustomerInfo | undefined): string[] {
  return (info?.nonSubscriptionTransactions ?? [])
    .filter((t) => t.productIdentifier.startsWith(CLAIM_KIT_PRODUCT))
    .map((t) => t.transactionIdentifier);
}

export function isClaimKitPackage(p: PurchasesPackage): boolean {
  return p.product.identifier.startsWith(CLAIM_KIT_PRODUCT);
}

export async function loadPackages(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export type PurchaseOutcome =
  | { ok: true; info: CustomerInfo; productIdentifier: string }
  | { ok: false; cancelled: boolean; message?: string };

export async function buy(pkg: PurchasesPackage): Promise<PurchaseOutcome> {
  try {
    const { customerInfo, productIdentifier } = await Purchases.purchasePackage(pkg);
    return { ok: true, info: customerInfo, productIdentifier };
  } catch (e) {
    const err = e as { userCancelled?: boolean | null; message?: string };
    return { ok: false, cancelled: Boolean(err.userCancelled), message: err.message };
  }
}

export async function restore(): Promise<CustomerInfo | undefined> {
  try {
    return await Purchases.restorePurchases();
  } catch {
    return undefined;
  }
}

export async function currentCustomerInfo(): Promise<CustomerInfo | undefined> {
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return undefined;
  }
}

export function onCustomerInfo(listener: (info: CustomerInfo) => void): () => void {
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => Purchases.removeCustomerInfoUpdateListener(listener);
}
