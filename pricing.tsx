import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { loadBillingSummary } from "@/lib/billing";
import { formatTokens, PLANS, TIER_ORDER, type Tier } from "@/lib/plans";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Plans & usage — Brave AI" },
      { name: "description", content: "Compare Brave AI plans and review your current usage." },
      { property: "og:title", content: "Brave AI plans" },
      { property: "og:description", content: "Compare Brave AI plans and monthly pricing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

type Summary = Awaited<ReturnType<typeof loadBillingSummary>>;

function PricingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    loadBillingSummary().then(setSummary).catch(() => setSummary(null));
  }, [user]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <Button variant="ghost" className="mb-8 gap-2" onClick={() => window.history.back()}>
          <ArrowLeft className="size-4" />
          Back to chat
        </Button>

        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-medium text-muted-foreground">BRAVE AI</p>
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">Choose how deeply Brave thinks.</h1>
          <p className="mt-4 text-base text-muted-foreground">
            Every plan uses our smartest model. Higher plans unlock deeper reasoning and larger allowances.
          </p>
        </div>

        {summary ? (
          <section className="mb-8 border-y py-5" aria-label="Current usage">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current plan</p>
                <p className="font-display text-2xl font-semibold">{summary.plan.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Available now</p>
                <p className="font-display text-2xl font-semibold">{formatTokens(summary.usage.remaining)} tokens</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Brave AI plans">
          {TIER_ORDER.map((tier) => (
            <PlanCard key={tier} tier={tier} currentTier={summary?.tier ?? "free"} />
          ))}
        </section>

        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <LockKeyhole className="size-4" />
          Secure Stripe checkout will become available after payments are enabled for this workspace.
        </p>
      </div>
    </main>
  );
}

function PlanCard({ tier, currentTier }: { tier: Tier; currentTier: Tier }) {
  const plan = PLANS[tier];
  const current = tier === currentTier;
  const paid = plan.price > 0;
  const features = [
    `${formatTokens(plan.dailyTokens)} tokens each day`,
    `${plan.modelLabel} reasoning`,
    plan.weeklyBonus ? `${formatTokens(plan.weeklyBonus)} weekly bonus` : "Saved chat history",
    "Voice input",
  ];

  return (
    <article className="flex min-h-[26rem] flex-col rounded-lg border bg-card p-5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">{plan.name}</h2>
          {current ? <span className="text-xs font-medium text-muted-foreground">CURRENT</span> : null}
        </div>
        <p className="mt-4 font-display text-4xl font-semibold">
          ${plan.price}<span className="text-sm font-normal text-muted-foreground">/month</span>
        </p>
        <p className="mt-3 min-h-12 text-sm text-muted-foreground">{plan.blurb}</p>
      </div>
      <ul className="my-6 space-y-3 text-sm">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
      <Button className="mt-auto w-full" variant={current ? "outline" : "default"} disabled={current || paid}>
        {current ? "Your plan" : paid ? "Stripe setup needed" : "Free"}
      </Button>
    </article>
  );
}