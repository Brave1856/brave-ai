import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { redeemAdminCode } from "@/hooks/useAccess";
import { canUse, findModel, MODELS } from "@/lib/models";
import { PLANS, type Tier } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, KeyRound, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Props = {
  value: string;
  onChange: (id: string) => void;
  tier: Tier;
  unlocked: boolean;
  onUnlocked: () => void;
};

export function ModelPicker({ value, onChange, tier, unlocked, onUnlocked }: Props) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const current = findModel(value);

  async function redeem() {
    try {
      await redeemAdminCode(code.trim());
      toast.success("Admin access unlocked — every model is now available.");
      setCode("");
      onUnlocked();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "That code isn't valid.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          {current?.label ?? "Choose model"}
          <ChevronDown className="size-3.5 opacity-60" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Choose a model</DialogTitle>
          <DialogDescription>
            {unlocked ? "Admin access: every model is unlocked." : `You're on the ${PLANS[tier].name} plan.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          {MODELS.map((m) => {
            const ok = canUse(m, tier, unlocked);
            return (
              <button
                key={m.id}
                type="button"
                disabled={!ok}
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition",
                  ok ? "hover:bg-accent" : "cursor-not-allowed opacity-50",
                  m.id === value && "bg-accent",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{m.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.maker} · {m.blurb}
                  </div>
                </div>
                {m.id === value ? (
                  <Check className="size-4" />
                ) : !ok ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="size-3" /> {PLANS[m.minTier].name}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {!unlocked ? (
          <div className="flex gap-2 border-t pt-3">
            <Input
              type="password"
              placeholder="Admin code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button type="button" variant="secondary" className="gap-1.5" onClick={redeem} disabled={!code.trim()}>
              <KeyRound className="size-4" /> Unlock
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
