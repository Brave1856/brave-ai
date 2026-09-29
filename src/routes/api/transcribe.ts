import { authenticateRequest } from "@/lib/request-auth.server";
import { createFileRoute } from "@tanstack/react-router";

const MAX_BYTES = 13 * 1024 * 1024;

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return new Response("Please sign in again.", { status: 401 });

        const declared = Number(request.headers.get("content-length") ?? 0);
        if (declared > MAX_BYTES + 64 * 1024) {
          return new Response("Recording is too long. Keep it under 2 minutes.", { status: 413 });
        }

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File) || !file.size) {
          return new Response("No audio received.", { status: 400 });
        }
        if (file.size > MAX_BYTES) {
          return new Response("Recording is too long. Keep it under 2 minutes.", { status: 413 });
        }
        if (!file.type.startsWith("audio/")) {
          return new Response("Unexpected audio format.", { status: 400 });
        }

        const baseURL = (process.env["AI_BASE_URL"] ?? process.env["OPENAI_BASE_URL"] ?? "https://api.openai.com/v1").replace(/\/+$/, "");
        const key = process.env["AI_API_KEY"] ?? process.env["OPENAI_API_KEY"];
        if (!key) return new Response("Voice input needs AI_API_KEY (or OPENAI_API_KEY).", { status: 500 });

        const upstream = new FormData();
        upstream.append("model", process.env["TRANSCRIBE_MODEL"] || "whisper-1");
        upstream.append("file", file, file.name || "recording.wav");
        upstream.append("response_format", "json");
        upstream.append("stream", "true");

        const res = await fetch(`${baseURL}/audio/transcriptions`, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
          signal: request.signal,
        });

        return new Response(res.body, {
          status: res.status,
          headers: {
            "Content-Type": res.headers.get("content-type") ?? "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
          },
        });
      },
    },
  },
});
