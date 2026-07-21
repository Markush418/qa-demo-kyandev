export interface UploadResponse {
  documentId: string;
  filename: string;
  pageCount: number;
  chunkCount: number;
}

export interface Source {
  chunkIndex: number;
  content: string;
  score: number;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onMeta: (meta: { mode: string; sources: Source[] }) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al subir el documento");
  return data;
}

export async function sendChatMessageStream(
  documentId: string,
  message: string,
  callbacks: StreamCallbacks
): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, message }),
    });
  } catch {
    callbacks.onError(new Error("Error de red. Verificá tu conexión."));
    return;
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    callbacks.onError(new Error(data.error ?? "Error en el servidor"));
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        // SSE format: "data: <json>"
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const event = JSON.parse(jsonStr);
          if (event.type === "meta") callbacks.onMeta(event);
          else if (event.type === "token") callbacks.onToken(event.content);
          else if (event.type === "done") callbacks.onDone();
        } catch {
          // skip malformed lines
        }
      }
    }
  } catch {
    callbacks.onError(new Error("Se interrumpió la conexión con el servidor"));
  }
}

export async function fetchSuggestions(documentId: string): Promise<string[]> {
  try {
    const res = await fetch("/api/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.questions) ? data.questions : [];
  } catch {
    return [];
  }
}
