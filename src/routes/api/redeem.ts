import { authenticateRequest } from "@/lib/request-auth.server";
import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/redeem")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authenticateRequest(request);
        if (!auth) return new Response("Please sign in again.", { status: 401 });
        const { code } = (await request.json()) as { code?: unknown };
        const secret = process.env["BRAVE_ADMIN_CODE"] ?? "";
        const a = Buffer.from(String(code ?? ""));
        const b = Buffer.from(secret);
        if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("That code isn't valid.", { status: 403 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("model_unlocks")
          .upsert({ user_id: auth.userId });
        if (error) return new Response("Couldn't unlock right now.", { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
