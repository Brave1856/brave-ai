import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { messageText, saveMessage, titleFromText } from "@/lib/chat-store";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { startRecording, transcribe } from "@/lib/voice";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Props = {
  threadId: string;
  userId: string;
  initialMessages: UIMessage[];
  isUntitled: boolean;
  onTitle: (title: string) => void;
  onUsageChange?: () => void;
};

async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export function ChatWindow({ threadId, userId, initialMessages, isUntitled, onTitle, onUsageChange }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: async () => ({ Authorization: `Bearer ${await accessToken()}` }),
    }),
    onFinish: ({ message }) => {
      const text = messageText(message);
      if (!text) return;
      saveMessage({ conversationId: threadId, userId, role: "assistant", content: text }).catch(
        () => toast.error("Couldn't save that reply."),
      );
      textareaRef.current?.focus();
      onUsageChange?.();
    },
    onError: (error) =>
      toast.error(error.message || "The assistant couldn't reply. Please try again."),
  });

  useEffect(() => {
    textareaRef.current?.focus();
  }, [threadId]);

  const isBusy = status === "submitted" || status === "streaming";

  const recorderRef = useRef<Awaited<ReturnType<typeof startRecording>> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [voice, setVoice] = useState<"idle" | "recording" | "transcribing">("idle");

  useEffect(() => () => recorderRef.current?.cancel(), []);

  async function toggleVoice() {
    if (voice === "transcribing") return;
    if (voice === "idle") {
      try {
        recorderRef.current = await startRecording();
        setVoice("recording");
        timerRef.current = setTimeout(() => void toggleVoiceStop(), 120_000);
      } catch {
        toast.error("Microphone access is needed to talk. Please allow it in your browser.");
      }
      return;
    }
    await toggleVoiceStop();
  }

  async function toggleVoiceStop() {
    if (timerRef.current) clearTimeout(timerRef.current);
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (!recorder) return;
    setVoice("transcribing");
    try {
      const file = await recorder.stop();
      const text = await transcribe(file, await accessToken());
      if (!text) toast.error("I didn't catch any words. Try again.");
      else await handleSubmit({ text });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't understand that recording.");
    } finally {
      setVoice("idle");
    }
  }

  async function handleSubmit(message: { text: string }) {
    const text = message.text.trim();
    if (!text || isBusy) return;

    sendMessage({ text });
    textareaRef.current?.focus();

    try {
      await saveMessage({ conversationId: threadId, userId, role: "user", content: text });
      if (isUntitled) onTitle(titleFromText(text));
    } catch {
      toast.error("Couldn't save your message.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-8">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Start the conversation"
              description="Ask a question, draft something, or think out loud."
            />
          ) : null}

          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, index) =>
                  part.type === "text" ? (
                    <MessageResponse key={index}>{part.text}</MessageResponse>
                  ) : null,
                )}
              </MessageContent>
            </Message>
          ))}

          {status === "submitted" ? (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Thinking…</Shimmer>
              </MessageContent>
            </Message>
          ) : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background/80 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              ref={textareaRef}
              placeholder={
                voice === "recording"
                  ? "Listening… tap the square when you're done"
                  : voice === "transcribing"
                    ? "Turning your voice into text…"
                    : "Message Brave AI… or tap the mic to talk"
              }
            />
            <PromptInputFooter className="justify-end gap-2">
              <Button
                type="button"
                size="icon-sm"
                variant={voice === "recording" ? "destructive" : "ghost"}
                onClick={toggleVoice}
                disabled={isBusy || voice === "transcribing"}
                aria-label={voice === "recording" ? "Stop recording" : "Talk"}
                className={voice === "recording" ? "animate-pulse" : ""}
              >
                {voice === "recording" ? (
                  <Square className="size-4" />
                ) : voice === "transcribing" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Mic className="size-4" />
                )}
              </Button>
              <PromptInputSubmit status={status} disabled={isBusy} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
