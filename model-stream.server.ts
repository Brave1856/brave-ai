import type { ModelInfo } from "@/lib/models";
import type { Plan } from "@/lib/plans";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText, type ModelMessage, type UIMessage } from "ai";

function getAiConfig() {
  const baseURL = (
    process.env["AI_BASE_URL"] ??
    process.env["OPENAI_BASE_URL"] ??
    "https://api.openai.com/v1"
  ).replace(/\/+$/, "");
  const apiKey = process.env["AI_API_KEY"] ?? process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error("Missing AI_API_KEY (or OPENAI_API_KEY). Set it in your server environment.");
  }
  return { baseURL, apiKey };
}

function modelIdForEndpoint(model: ModelInfo) {
  // Most OpenAI-compatible gateways expect their provider/model identifier verbatim.
  return model.id;
}

export async function streamWithModel(opts: {
  request: Request;
  model: ModelInfo;
  plan: Plan;
  userId: string;
  system: string;
  messages: ModelMessage[];
  originalMessages: UIMessage[];
}) {
  const { baseURL, apiKey } = getAiConfig();
  const { request, model } = opts;
  const provider = createOpenAICompatible({
    name: "independent",
    baseURL,
    apiKey,
  });

  const result = streamText({
    system: opts.system,
    messages: opts.messages,
    abortSignal: request.signal,
    maxRetries: 0,
    model: provider.chatModel(modelIdForEndpoint(model)),
    maxOutputTokens: 32000,
    onFinish: async ({ totalUsage }: { totalUsage: { totalTokens?: number | undefined } }) => {
      const tokens = totalUsage.totalTokens ?? 0;
      if (!tokens) return;
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("token_usage")
          .insert({ user_id: opts.userId, tokens, model: model.id });
        if (error) console.error("Failed to record usage", error);
      } catch (error) {
        console.error("Unable to record usage", error);
      }
    },
  });

  return result.toUIMessageStreamResponse({
    originalMessages: opts.originalMessages,
  });
}
