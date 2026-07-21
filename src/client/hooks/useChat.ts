import { useState, useCallback } from "react";
import { sendChatMessageStream, type Source } from "../lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  mode?: string;
  streaming?: boolean;
}

export function useChat(documentId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const assistantId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: trimmed },
        { id: assistantId, role: "assistant", content: "", streaming: true },
      ]);
      setLoading(true);
      setError(null);

      await sendChatMessageStream(documentId, trimmed, {
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + token } : m
            )
          );
        },
        onMeta: ({ mode, sources }) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, mode, sources } : m
            )
          );
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, streaming: false } : m
            )
          );
          setLoading(false);
        },
        onError: (err) => {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          setError(err.message);
          setLoading(false);
        },
      });
    },
    [documentId, loading]
  );

  return { messages, loading, error, send };
}
