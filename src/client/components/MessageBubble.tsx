import { useState } from "react";
import Markdown from "react-markdown";
import type { Message } from "../hooks/useChat";

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "rounded-tr-sm bg-indigo-600 text-white"
              : "rounded-tl-sm bg-slate-100 text-slate-900"
          }`}
        >
          {isUser ? (
            message.content
          ) : (
            <Markdown
              components={{
                h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-0.5 first:mt-0">{children}</h3>,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="leading-snug">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                table: ({ children }) => <div className="overflow-x-auto mb-2"><table className="text-xs border-collapse w-full">{children}</table></div>,
                th: ({ children }) => <th className="border border-slate-300 bg-slate-200 px-2 py-1 text-left font-semibold">{children}</th>,
                td: ({ children }) => <td className="border border-slate-200 px-2 py-1">{children}</td>,
              }}
            >
              {message.content}
            </Markdown>
          )}
        </div>

        {/* Fuentes expandibles — solo mensajes de asistente con sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setSourcesOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors py-0.5"
            >
              <svg
                className={`h-3 w-3 transition-transform ${sourcesOpen ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              {sourcesOpen ? "Ocultar" : "Ver"} {message.sources.length}{" "}
              {message.sources.length === 1 ? "fuente" : "fuentes"}
            </button>

            {sourcesOpen && (
              <div className="mt-1 flex flex-col gap-2">
                {message.sources.map((src, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium text-slate-400">
                        Fragmento #{src.chunkIndex + 1}
                      </span>
                      <span className="text-slate-300">
                        {(src.score * 100).toFixed(0)}% relevancia
                      </span>
                    </div>
                    <p className="line-clamp-4 leading-relaxed">{src.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
