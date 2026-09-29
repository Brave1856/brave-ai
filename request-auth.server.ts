import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PLANS, isTier, startOfWeekUtc, summarizeUsage, type Plan } from "@/lib/plans";

export async function authenticateRequest(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
}

type Authed = NonNullable<Awaited<ReturnType<typeof authenticateRequest>>>;

export async function getPlanAndUsage({ supabase }: Authed) {
  const { data: sub } = await supabase.from("subscriptions").select("tier, status").maybeSingle();
  const { data: unlock } = await supabase.from("model_unlocks").select("user_id").maybeSingle();
  const unlocked = !!unlock;
  const active = sub && sub.status === "active" && isTier(sub.tier);
  const plan: Plan = unlocked
    ? PLANS.ultimate
    : active
      ? PLANS[sub.tier as keyof typeof PLANS]
      : PLANS.free;
  const { data: rows } = await supabase.rpc("usage_by_day", {
    _since: startOfWeekUtc().toISOString(),
  });
  const usage = summarizeUsage(
    plan,
    (rows ?? []).map((r) => ({ day: String(r.day), tokens: Number(r.tokens) })),
  );
  return { plan, usage, unlocked };
}
