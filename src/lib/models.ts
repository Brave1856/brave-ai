import { TIER_ORDER, type Tier } from "@/lib/plans";

export type Provider = "openai" | "anthropic" | "google";

export type ModelInfo = {
  id: string;
  label: string;
  maker: string;
  provider: Provider;
  minTier: Tier;
  blurb: string;
  /** Higher = better at writing code. Used to pick the App Builder default. */
  coding: number;
  reasoning: boolean;
};

export const MODELS: ModelInfo[] = [
  // Free
  { id: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", maker: "Google", provider: "google", minTier: "free", blurb: "Very fast, lightweight", coding: 2, reasoning: false },
  { id: "openai/gpt-6-luna", label: "GPT-6 Luna", maker: "OpenAI", provider: "openai", minTier: "free", blurb: "Quick everyday GPT-6", coding: 4, reasoning: true },
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", maker: "Google", provider: "google", minTier: "free", blurb: "Balanced and fast", coding: 3, reasoning: false },
  { id: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5", maker: "Anthropic", provider: "anthropic", minTier: "free", blurb: "Anthropic's fastest", coding: 4, reasoning: false },
  // Basic
  { id: "openai/chat-latest", label: "ChatGPT Instant", maker: "OpenAI", provider: "openai", minTier: "basic", blurb: "Natural conversation", coding: 3, reasoning: false },
  { id: "openai/gpt-6-sol", label: "GPT-6 Sol", maker: "OpenAI", provider: "openai", minTier: "basic", blurb: "Strong mid-tier GPT-6", coding: 6, reasoning: true },
  { id: "google/gemini-3.6-flash", label: "Gemini 3.6 Flash", maker: "Google", provider: "google", minTier: "basic", blurb: "Fast reasoning", coding: 5, reasoning: false },
  { id: "google/gemini-3.7-flash", label: "Gemini 3.7 Flash", maker: "Google", provider: "google", minTier: "basic", blurb: "Fast reasoning, newer", coding: 5, reasoning: false },
  { id: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5", maker: "Anthropic", provider: "anthropic", minTier: "basic", blurb: "Smart and speedy", coding: 7, reasoning: false },
  // Pro
  { id: "openai/gpt-6-astra", label: "GPT-6 Astra", maker: "OpenAI", provider: "openai", minTier: "pro", blurb: "OpenAI's most capable", coding: 8, reasoning: true },
  { id: "google/gemini-3.8-flash", label: "Gemini 3.8 Flash", maker: "Google", provider: "google", minTier: "pro", blurb: "Latest Gemini Flash", coding: 6, reasoning: false },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", maker: "Google", provider: "google", minTier: "pro", blurb: "Google's deep reasoner", coding: 7, reasoning: false },
  { id: "anthropic/claude-opus-5", label: "Claude Opus 5", maker: "Anthropic", provider: "anthropic", minTier: "pro", blurb: "Complex coding & agents", coding: 9, reasoning: false },
  // Ultimate
  { id: "openai/gpt-5.5-pro", label: "GPT-5.5 Pro", maker: "OpenAI", provider: "openai", minTier: "ultimate", blurb: "Extended reasoning", coding: 8, reasoning: true },
  { id: "anthropic/claude-opus-5-5", label: "Claude Opus 5.5", maker: "Anthropic", provider: "anthropic", minTier: "ultimate", blurb: "Long-running coding work", coding: 10, reasoning: false },
  { id: "anthropic/claude-fable-5-1", label: "Claude Fable 5.1", maker: "Anthropic", provider: "anthropic", minTier: "ultimate", blurb: "The smartest — best at coding", coding: 11, reasoning: false },
];

export const DEFAULT_CHAT_MODEL = "openai/gpt-6-luna";

export function findModel(id: unknown): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}

export function canUse(model: ModelInfo, tier: Tier, unlocked: boolean) {
  return unlocked || TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(model.minTier);
}

export function bestCoder(tier: Tier, unlocked: boolean): ModelInfo {
  return [...MODELS]
    .filter((m) => canUse(m, tier, unlocked))
    .sort((a, b) => b.coding - a.coding)[0]!;
}
