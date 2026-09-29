import { ChatWindow } from "@/components/chat/ChatWindow";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  createConversation,
  deleteConversation,
  listConversations,
  loadMessages,
  renameConversation,
  type Conversation,
} from "@/lib/chat-store";
import { cn } from "@/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { UIMessage } from "ai";
import { CreditCard, LogOut, MessageSquarePlus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Chat — Brave AI" },
      {
        name: "description",
        content: "Your saved AI conversation with streaming replies on Brave AI.",
      },
      { property: "og:title", content: "Chat — Brave AI" },
      {
        property: "og:description",
        content: "Your saved AI conversation with streaming replies on Brave AI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const { threadId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);

  const refreshConversations = useCallback(async () => {
    const list = await listConversations();
    setConversations(list);
    return list;
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    refreshConversations().catch(() => toast.error("Couldn't load your conversations."));
  }, [user, refreshConversations]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setInitialMessages(null);
    loadMessages(threadId)
      .then((msgs) => {
        if (active) setInitialMessages(msgs);
      })
      .catch(() => {
        if (active) setInitialMessages([]);
      });
    return () => {
      active = false;
    };
  }, [threadId, user]);

  async function handleNewChat() {
    if (!user) return;
    try {
      const conversation = await createConversation(user.id);
      await refreshConversations();
      navigate({ to: "/chat/$threadId", params: { threadId: conversation.id } });
    } catch {
      toast.error("Couldn't start a new conversation.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteConversation(id);
      const list = await refreshConversations();
      if (id === threadId) {
        const next = list[0];
        if (next) {
          navigate({ to: "/chat/$threadId", params: { threadId: next.id } });
        } else {
          navigate({ to: "/" });
        }
      }
    } catch {
      toast.error("Couldn't delete that conversation.");
    }
  }

  async function handleTitle(title: string) {
    try {
      await renameConversation(threadId, title);
      await refreshConversations();
    } catch {
      /* title is cosmetic */
    }
  }

  const active = conversations.find((c) => c.id === threadId);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="hidden w-72 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2 px-4 py-4">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground">
            B
          </div>
          <span className="font-display text-base font-semibold tracking-tight">Brave AI</span>
        </div>

        <div className="px-3">
          <Button className="w-full justify-start gap-2" onClick={handleNewChat}>
            <MessageSquarePlus className="size-4" />
            New conversation
          </Button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "group flex items-center gap-1 rounded-lg px-2 transition-colors",
                conversation.id === threadId
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <button
                type="button"
                onClick={() =>
                  navigate({ to: "/chat/$threadId", params: { threadId: conversation.id } })
                }
                className="flex-1 truncate py-2 text-left text-sm"
              >
                {conversation.title}
              </button>
              <button
                type="button"
                aria-label="Delete conversation"
                onClick={() => handleDelete(conversation.id)}
                className="rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:text-destructive group-hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t px-3 py-3">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground"
            onClick={() => navigate({ to: "/pricing" })}
          >
            <CreditCard className="size-4" />
            Plans & usage
          </Button>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-6">
          <h1 className="truncate font-display text-sm font-medium">
            {active?.title ?? "Conversation"}
          </h1>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate({ to: "/pricing" })}>
              Plans
            </Button>
            <Button size="sm" variant="outline" className="gap-2 md:hidden" onClick={handleNewChat}>
              <MessageSquarePlus className="size-4" />
              New
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1">
          {user && initialMessages ? (
            <ChatWindow
              key={threadId}
              threadId={threadId}
              userId={user.id}
              initialMessages={initialMessages}
              isUntitled={!active || active.title === "New chat"}
              onTitle={handleTitle}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
