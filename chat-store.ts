import { supabase } from "@/integrations/supabase/client";
import type { UIMessage } from "ai";

export type Conversation = {
  id: string;
  title: string;
  updated_at: string;
};

export async function listConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createConversation(userId: string): Promise<Conversation> {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: userId, title: "New chat" })
    .select("id, title, updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteConversation(id: string) {
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw error;
}

export async function renameConversation(id: string, title: string) {
  const { error } = await supabase
    .from("conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function loadMessages(conversationId: string): Promise<UIMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role === "user" ? "user" : "assistant",
    parts: [{ type: "text" as const, text: row.content }],
  })) as UIMessage[];
}

export async function saveMessage(args: {
  conversationId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
}) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: args.conversationId,
    user_id: args.userId,
    role: args.role,
    content: args.content,
  });
  if (error) throw error;
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", args.conversationId);
}

export function messageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

export function titleFromText(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean || "New chat";
}
