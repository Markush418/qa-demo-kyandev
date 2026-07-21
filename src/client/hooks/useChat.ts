import { useState, useCallback } from "react";
import { sendChatMessage, type Source } from "../lib/api";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export function useChat(documentId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: trimmed },
      ]);
      setLoading(true);
      setError(null);

      try {
        const response = await sendChatMessage(documentId, trimmed);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: response.reply,
            sources: response.sources,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al enviar el mensaje");
      } finally {
        setLoading(false);
      }
    },
    [documentId, loading]
  );

  return { messages, loading, error, send };
}
