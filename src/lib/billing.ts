import { supabase } from "@/integrations/supabase/client";
import { PLANS, isTier, startOfWeekUtc, summarizeUsage, type Tier } from "@/lib/plans";

export async function loadBillingSummary() {
  const [{ data: subscription, error: subscriptionError }, { data: rows, error: usageError }] =
    await Promise.all([
      supabase.from("subscriptions").select("tier, status, current_period_end").maybeSingle(),
      supabase.rpc("usage_by_day", { _since: startOfWeekUtc().toISOString() }),
    ]);

  if (subscriptionError) throw subscriptionError;
  if (usageError) throw usageError;

  const tier: Tier =
    subscription?.status === "active" && isTier(subscription.tier) ? subscription.tier : "free";
  return {
    tier,
    plan: PLANS[tier],
    usage: summarizeUsage(
      PLANS[tier],
      (rows ?? []).map((row) => ({ day: String(row.day), tokens: Number(row.tokens) })),
    ),
    currentPeriodEnd: subscription?.current_period_end ?? null,
  };
}