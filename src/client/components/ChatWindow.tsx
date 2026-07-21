import { useEffect, useRef } from "react";
import type { Message } from "../hooks/useChat";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: Message[];
  loading: boolean;
  filename: string;
  suggestions: string[];
  onSuggestionClick: (q: string) => void;
}

export function ChatWindow({ messages, loading, filename, suggestions, onSuggestionClick }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      {isEmpty ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
            <svg
              className="h-6 w-6 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">Documento listo</p>
            <p className="mt-1 text-xs text-slate-400">
              Preguntá algo sobre <span className="font-medium">{filename}</span>
            </p>
          </div>

          {suggestions.length > 0 && (
            <div className="mt-2 flex w-full max-w-lg flex-col gap-2">
              <p className="text-xs text-slate-400">Preguntas sugeridas</p>
              <div className="flex flex-col gap-2">
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onSuggestionClick(q)}
                    disabled={loading}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-xs text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {suggestions.length === 0 && !loading && (
            <div className="mt-1 flex flex-wrap justify-center gap-1.5">
              {["¿De qué trata este documento?", "¿Cuáles son los puntos principales?"].map((q) => (
                <button
                  key={q}
                  onClick={() => onSuggestionClick(q)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
