import { useEffect, useState } from "react";
import { useUpload } from "./hooks/useUpload";
import { useChat } from "./hooks/useChat";
import { fetchSuggestions } from "./lib/api";
import { UploadZone } from "./components/UploadZone";
import { DocumentInfo } from "./components/DocumentInfo";
import { ChatWindow } from "./components/ChatWindow";
import { ChatInput } from "./components/ChatInput";

export default function App() {
  const { state: uploadState, upload, reset } = useUpload();
  const doc = uploadState.result;

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-3.5">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span className="text-sm font-semibold text-slate-900">Document Q&A</span>
          <span className="ml-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-medium text-indigo-600">
            demo
          </span>
        </div>
      </header>

      {!doc ? (
        // Vista de upload
        <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-slate-900">
              Preguntale a tu documento
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Subí un PDF, DOCX o Markdown y hacé preguntas en lenguaje natural
            </p>
          </div>
          <UploadZone
            state={uploadState}
            onFile={upload}
            onReset={reset}
          />
        </main>
      ) : (
        // Vista de chat — key={doc.documentId} resetea el hook al cambiar documento
        <ChatView doc={doc} onReset={reset} />
      )}
    </div>
  );
}

function ChatView({
  doc,
  onReset,
}: {
  doc: NonNullable<ReturnType<typeof useUpload>["state"]["result"]>;
  onReset: () => void;
}) {
  const { messages, loading, error, send } = useChat(doc.documentId);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetchSuggestions(doc.documentId).then(setSuggestions);
  }, [doc.documentId]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DocumentInfo doc={doc} onReset={onReset} />

      <ChatWindow
        messages={messages}
        loading={loading}
        filename={doc.filename}
        suggestions={suggestions}
        onSuggestionClick={send}
      />

      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 sm:mx-6">
          {error}
        </div>
      )}

      <ChatInput
        onSend={send}
        loading={loading}
        filename={doc.filename}
      />
    </div>
  );
}
