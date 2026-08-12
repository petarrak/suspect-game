"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

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

export async function getPremiumStatus(): Promise<PremiumStatus> {
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