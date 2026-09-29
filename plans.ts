export type Tier = "free" | "basic" | "pro" | "ultimate";

export type Plan = {
  tier: Tier;
  name: string;
  price: number;
  model: string;
  modelLabel: string;
  reasoningEffort: "low" | "medium" | "high" | "xhigh";
  dailyTokens: number;
  weeklyBonus: number;
  blurb: string;
};

export const PLANS: Record<Tier, Plan> = {
  free: {
    tier: "free",
    name: "Free",
    price: 0,
    model: "openai/gpt-6-astra",
    modelLabel: "Brave Quick",
    reasoningEffort: "low",
    dailyTokens: 10_000,
    weeklyBonus: 0,
    blurb: "Try it out with a small daily allowance.",
  },
  basic: {
    tier: "basic",
    name: "Basic",
    price: 12,
    model: "openai/gpt-6-astra",
    modelLabel: "Brave Core",
    reasoningEffort: "medium",
    dailyTokens: 100_000,
    weeklyBonus: 0,
    blurb: "A smarter assistant for everyday use.",
  },
  pro: {
    tier: "pro",
    name: "Pro",
    price: 28,
    model: "openai/gpt-6-astra",
    modelLabel: "Brave Pro",
    reasoningEffort: "high",
    dailyTokens: 1_000_000,
    weeklyBonus: 0,
    blurb: "10× the allowance and a much sharper model.",
  },
  ultimate: {
    tier: "ultimate",
    name: "Ultimate",
    price: 50,
    model: "openai/gpt-6-astra",
    modelLabel: "Brave Max",
    reasoningEffort: "xhigh",
    dailyTokens: 10_000_000,
    weeklyBonus: 25_000_000,
    blurb: "Our smartest model, huge limits, plus a weekly bonus.",
  },
};

export const TIER_ORDER: Tier[] = ["free", "basic", "pro", "ultimate"];

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (TIER_ORDER as string[]).includes(value);
}

/** Monday 00:00 UTC of the current week. */
export function startOfWeekUtc(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

export type UsageSummary = {
  todayUsed: number;
  dailyLimit: number;
  bonusUsed: number;
  bonusLimit: number;
  remaining: number;
};

/** rows: tokens per UTC day for the current week. */
export function summarizeUsage(
  plan: Plan,
  rows: { day: string; tokens: number }[],
  now = new Date(),
): UsageSummary {
  const today = now.toISOString().slice(0, 10);
  let todayUsed = 0;
  let bonusUsed = 0;
  for (const row of rows) {
    const t = Number(row.tokens) || 0;
    if (row.day === today) todayUsed = t;
    bonusUsed += Math.max(0, t - plan.dailyTokens);
  }
  bonusUsed = Math.min(bonusUsed, plan.weeklyBonus);
  const remaining =
    Math.max(0, plan.dailyTokens - todayUsed) + Math.max(0, plan.weeklyBonus - bonusUsed);
  return {
    todayUsed,
    dailyLimit: plan.dailyTokens,
    bonusUsed,
    bonusLimit: plan.weeklyBonus,
    remaining,
  };
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(1)}k`;
  return String(n);
}
