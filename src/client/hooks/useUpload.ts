import { useState, useRef } from "react";
import { uploadDocument, type UploadResponse } from "../lib/api";

type UploadStatus = "idle" | "uploading" | "error" | "done";

export interface UploadState {
  status: UploadStatus;
  progress: number;
  result: UploadResponse | null;
  error: string | null;
}

export function useUpload() {
  const [state, setState] = useState<UploadState>({
    status: "idle",
    progress: 0,
    result: null,
    error: null,
  });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function clearTicker() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  // Simula progreso asintótico hacia 90% mientras espera la respuesta del servidor
  // (el paso lento es la llamada a OpenAI para embeddings)
  function startFakeTicker() {
    intervalRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.progress >= 88) return prev;
        const delta = (88 - prev.progress) * 0.06;
        return { ...prev, progress: prev.progress + Math.max(delta, 0.5) };
      });
    }, 400);
  }

  async function upload(file: File) {
    clearTicker();
    setState({ status: "uploading", progress: 5, result: null, error: null });
    startFakeTicker();

    try {
      const result = await uploadDocument(file);
      clearTicker();
      setState({ status: "done", progress: 100, result, error: null });
    } catch (err) {
      clearTicker();
      setState({
        status: "error",
        progress: 0,
        result: null,
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }

  function reset() {
    clearTicker();
    setState({ status: "idle", progress: 0, result: null, error: null });
  }

  return { state, upload, reset };
}
