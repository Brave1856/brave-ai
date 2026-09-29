import { supabase } from "@/integrations/supabase/client";
import { isTier, type Tier } from "@/lib/plans";
import { useCallback, useEffect, useState } from "react";

export function useAccess(userId: string | undefined) {
  const [tier, setTier] = useState<Tier>("free");
  const [unlocked, setUnlocked] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [{ data: sub }, { data: unlock }] = await Promise.all([
      supabase.from("subscriptions").select("tier, status").maybeSingle(),
      supabase.from("model_unlocks").select("user_id").maybeSingle(),
    ]);
    setTier(sub && sub.status === "active" && isTier(sub.tier) ? sub.tier : "free");
    setUnlocked(!!unlock);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { tier, unlocked, refresh };
}

export async function redeemAdminCode(code: string) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/redeem", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
    },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error((await res.text()) || "That code isn't valid.");
}
