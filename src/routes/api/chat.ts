import { authenticateRequest, getPlanAndUsage } from "@/lib/request-auth.server";
import { streamWithModel } from "@/lib/model-stream.server";
import { canUse, DEFAULT_CHAT_MODEL, findModel } from "@/lib/models";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, type UIMessage } from "ai";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return new Response("Please sign in again.", { status: 401 });

        const body = (await request.json()) as { messages?: unknown; model?: unknown };
        if (!Array.isArray(body.messages)) {
          return new Response("Messages are required", { status: 400 });
        }
        const messages = body.messages as UIMessage[];

        const { plan, usage, unlocked } = await getPlanAndUsage(auth);
        if (usage.remaining <= 0) {
          return new Response(
            `You've used today's ${plan.name} allowance. Upgrade your plan or come back tomorrow.`,
            { status: 402 },
          );
        }
        const model = findModel(body.model) ?? findModel(DEFAULT_CHAT_MODEL)!;
        if (!canUse(model, plan.tier, unlocked)) {
          return new Response(`${model.label} needs a higher plan. Upgrade to use it.`, {
            status: 403,
          });
        }

        const system =
          `You are Brave AI, a thoughtful and highly capable assistant. Right now you are running on the ` +
          `${model.label} model made by ${model.maker} (model id: ${model.id}). If someone asks what model ` +
          `you are, tell them exactly that. Reason carefully, give accurate and useful answers, use markdown ` +
          `when it improves clarity, and ask one concise clarifying question only when truly needed.`;

        return streamWithModel({
          request,
          model,
          plan,
          userId: auth.userId,
          system,
          messages: await convertToModelMessages(messages),
          originalMessages: messages,
        });
      },
    },
  },
});
