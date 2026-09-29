import { authenticateRequest, getPlanAndUsage } from "@/lib/request-auth.server";
import { streamWithModel } from "@/lib/model-stream.server";
import { bestCoder, canUse, findModel } from "@/lib/models";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, type UIMessage } from "ai";

const KIND_HINT: Record<string, string> = {
  web: "a web app",
  mobile: "a mobile app (write it with React Native / Expo)",
  desktop: "a desktop PC app (write it with Electron)",
  console: "a console / command-line app (write it in Python unless the user asks otherwise)",
  react: "a multi-file React + Vite web app",
};

function systemPrompt(kind: string, modelLabel: string, files: Record<string, string>) {
  const current = Object.entries(files)
    .map(([p, c]) => `--- ${p} ---\n${c}`)
    .join("\n\n");
  return `You are Brave AI App Builder, a world-class senior software engineer, running on ${modelLabel}.
You build ${KIND_HINT[kind] ?? "an app"} for the user. Write production-quality, complete, bug-free code with a polished, modern design.

OUTPUT FORMAT (strict):
- Start with 1-3 short sentences saying what you'll build or change.
- Then output EVERY file you create or change as a fenced code block whose info string has the language and path, e.g.
\`\`\`html path=index.html
...full file...
\`\`\`
- Always write the COMPLETE file content — never "..." or "rest unchanged". Files you don't output stay as they are.
- To delete a file, output a block with path and the single line: __DELETE__
- End with one short sentence of next-step ideas.

PREVIEW RULE: There must always be a working index.html at the root that runs in a browser with no build step.
It may load sibling .css/.js files by relative path and libraries from CDNs (e.g. esm.sh, unpkg, cdn.tailwindcss.com).
- For mobile apps: index.html shows a phone-framed web version of the same app.
- For desktop apps: index.html shows the app's UI as a web version.
- For console apps: index.html simulates a terminal running the same logic in JavaScript.
- For React apps: also make index.html runnable by loading React from esm.sh with an import map and Babel standalone if needed.

${current ? `CURRENT PROJECT FILES:\n${current}` : "The project is empty."}`;
}

/** Replace old code blocks in history so the model relies on CURRENT PROJECT FILES. */
function stripCode(messages: UIMessage[]): UIMessage[] {
  return messages.map((m) =>
    m.role !== "assistant"
      ? m
      : {
          ...m,
          parts: m.parts.map((p) =>
            p.type === "text"
              ? { ...p, text: p.text.replace(/```[^\n]*path=([^\s`]+)[\s\S]*?```/g, "[wrote $1]") }
              : p,
          ),
        },
  );
}

export const Route = createFileRoute("/api/build")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return new Response("Please sign in again.", { status: 401 });

        const body = (await request.json()) as {
          messages?: unknown;
          model?: unknown;
          kind?: unknown;
          files?: unknown;
        };
        if (!Array.isArray(body.messages)) return new Response("Messages are required", { status: 400 });
        const messages = body.messages as UIMessage[];
        const files =
          body.files && typeof body.files === "object" ? (body.files as Record<string, string>) : {};

        const { plan, usage, unlocked } = await getPlanAndUsage(auth);
        if (usage.remaining <= 0) {
          return new Response(
            `You've used today's ${plan.name} allowance. Upgrade your plan or come back tomorrow.`,
            { status: 402 },
          );
        }
        const model = findModel(body.model) ?? bestCoder(plan.tier, unlocked);
        if (!canUse(model, plan.tier, unlocked)) {
          return new Response(`${model.label} needs a higher plan.`, { status: 403 });
        }

        return streamWithModel({
          request,
          model,
          plan,
          userId: auth.userId,
          system: systemPrompt(String(body.kind ?? "web"), model.label, files),
          messages: await convertToModelMessages(stripCode(messages)),
          originalMessages: messages,
        });
      },
    },
  },
});
