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

export interface ChatResponse {
  reply: string;
  sources: Source[];
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al subir el documento");
  return data;
}

export async function sendChatMessage(
  documentId: string,
  message: string
): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentId, message }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al enviar el mensaje");
  return data;
}
