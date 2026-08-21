"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { Capacitor } from "@capacitor/core";
import { Purchases } from "@revenuecat/purchases-capacitor";

import {
  ensureAnonSession,
  supabase,
} from "@/lib/supabase";

export type PremiumPlan =
  | "monthly"
  | "yearly"
  | "lifetime";

export interface PremiumStatus {
  is_premium: boolean;
  plan: PremiumPlan | null;
  expires_at: string | null;
}

const REVENUECAT_API_KEY =
  process.env
    .NEXT_PUBLIC_REVENUECAT_GOOGLE_API_KEY;

const ENTITLEMENT_ID =
  process.env
    .NEXT_PUBLIC_REVENUECAT_ENTITLEMENT_ID ??
  "premium";

const PACKAGE_IDS: Record<
  PremiumPlan,
  string
> = {
  monthly: "$rc_monthly",
  yearly: "$rc_annual",
  lifetime: "$rc_lifetime",
};

let configurePromise:
  | Promise<void>
  | null = null;

function isNativeAndroid(): boolean {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android"
  );
}

async function configureRevenueCat(): Promise<void> {
  if (!isNativeAndroid()) {
    return;
  }

  if (configurePromise) {
    return configurePromise;
  }

  configurePromise = (async () => {
    if (!REVENUECAT_API_KEY) {
      throw new Error(
        "Missing NEXT_PUBLIC_REVENUECAT_GOOGLE_API_KEY."
      );
    }

    const userId =
      await ensureAnonSession();

    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: userId,
    });
  })();

  try {
    await configurePromise;
  } catch (error) {
    configurePromise = null;
    throw error;
  }
}

function unwrapCustomerInfo(
  result: any
): any {
  return (
    result?.customerInfo ??
    result
  );
}

function detectPlan(
  productIdentifier: string
): PremiumPlan | null {
  const product =
    productIdentifier.toLowerCase();

  if (
    product.includes("lifetime")
  ) {
    return "lifetime";
  }

  if (
    product.includes("yearly") ||
    product.includes("annual")
  ) {
    return "yearly";
  }

  if (
    product.includes("monthly") ||
    product.includes("month")
  ) {
    return "monthly";
  }

  return null;
}

function statusFromCustomerInfo(
  customerInfo: any
): PremiumStatus {
  const entitlement =
    customerInfo?.entitlements
      ?.active?.[ENTITLEMENT_ID];

  if (!entitlement) {
    return {
      is_premium: false,
      plan: null,
      expires_at: null,
    };
  }

  const productIdentifier =
    entitlement.productIdentifier ??
    entitlement.product_identifier ??
    "";

  return {
    is_premium: true,
    plan: detectPlan(
      productIdentifier
    ),
    expires_at:
      entitlement.expirationDate ??
      entitlement.expiration_date ??
      null,
  };
}

async function getSupabasePremiumStatus():
  Promise<PremiumStatus> {
  await ensureAnonSession();

  const { data, error } =
    await supabase.rpc(
      "get_my_premium_status"
    );

  if (error) {
    throw new Error(error.message);
  }

  return data as PremiumStatus;
}

export async function getPremiumStatus():
  Promise<PremiumStatus> {
  if (!isNativeAndroid()) {
    return getSupabasePremiumStatus();
  }

  await configureRevenueCat();

  const result =
    await Purchases.getCustomerInfo();

  return statusFromCustomerInfo(
    unwrapCustomerInfo(result)
  );
}

async function getPackageForPlan(
  plan: PremiumPlan
): Promise<any> {
  await configureRevenueCat();

  const result =
    await Purchases.getOfferings();

  const currentOffering =
    result.current;

  if (!currentOffering) {
    throw new Error(
      "RevenueCat offering nije pronađen."
    );
  }

  const packageId =
    PACKAGE_IDS[plan];

  const selectedPackage =
    currentOffering.availablePackages.find(
      (item: any) =>
        item.identifier === packageId
    );

  if (!selectedPackage) {
    throw new Error(
      `Premium paket ${plan} nije pronađen.`
    );
  }

  return selectedPackage;
}

export async function purchasePremium(
  plan: PremiumPlan
): Promise<PremiumStatus> {
  if (!isNativeAndroid()) {
    throw new Error(
      "Premium kupnja dostupna je u Android aplikaciji."
    );
  }

  const selectedPackage =
    await getPackageForPlan(plan);

  const result =
    await Purchases.purchasePackage({
      aPackage: selectedPackage,
    });

  const status =
    statusFromCustomerInfo(
      unwrapCustomerInfo(result)
    );

  if (!status.is_premium) {
    throw new Error(
      "Kupnja je završena, ali Premium još nije aktivan."
    );
  }

  return status;
}

export async function restorePremiumPurchases():
  Promise<PremiumStatus> {
  if (!isNativeAndroid()) {
    return getSupabasePremiumStatus();
  }

  await configureRevenueCat();

  const result =
    await Purchases.restorePurchases();

  return statusFromCustomerInfo(
    unwrapCustomerInfo(result)
  );
}

export function usePremiumStatus() {
  const [status, setStatus] =
    useState<PremiumStatus>({
      is_premium: false,
      plan: null,
      expires_at: null,
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const refresh =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const premiumStatus =
          await getPremiumStatus();

        setStatus(premiumStatus);
      } catch (e: any) {
        setError(
          e?.message ??
            "Could not load Premium status."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ...status,
    loading,
    error,
    refresh,
  };
}