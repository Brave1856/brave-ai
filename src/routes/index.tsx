import { useAuth } from "@/hooks/useAuth";
import { createConversation, listConversations } from "@/lib/chat-store";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brave AI — your smarter AI companion" },
      {
        name: "description",
        content:
          "Chat with an AI assistant, get streaming replies, and keep every conversation saved to your account.",
      },
      { property: "og:title", content: "Brave AI — your smarter AI companion" },
      {
        property: "og:description",
        content:
          "Chat with an AI assistant, get streaming replies, and keep every conversation saved to your account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (loading || started.current) return;
    started.current = true;

    if (!user) {
      navigate({ to: "/auth" });
      return;
    }

    (async () => {
      const conversations = await listConversations();
      const target = conversations[0] ?? (await createConversation(user.id));
      navigate({ to: "/chat/$threadId", params: { threadId: target.id } });
    })().catch(() => {
      started.current = false;
    });
  }, [loading, user, navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Loading your conversations…</p>
    </main>
  );
}
