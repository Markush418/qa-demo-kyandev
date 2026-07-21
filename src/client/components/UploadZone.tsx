import { useRef, useState, type DragEvent, type ChangeEvent } from "react";
import type { UploadState } from "../hooks/useUpload";

interface Props {
  state: UploadState;
  onFile: (file: File) => void;
  onReset: () => void;
}

const ACCEPTED = ".pdf,.docx";
const ACCEPTED_MIME = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export function UploadZone({ state, onFile, onReset }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_MIME.includes(file.type) && ext !== "pdf" && ext !== "docx") {
      return;
    }
    onFile(file);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  if (state.status === "uploading") {
    return (
      <div className="flex w-full max-w-md flex-col gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
            <div>
              <p className="text-sm font-medium text-slate-900">Procesando documento…</p>
              <p className="text-xs text-slate-400">
                Generando embeddings, puede tardar hasta 30 s
              </p>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <p className="mt-2 text-right text-xs text-slate-400">
            {Math.round(state.progress)}%
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <button
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`group w-full rounded-xl border-2 border-dashed p-10 text-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
          dragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-slate-300 bg-white hover:border-indigo-300 hover:bg-slate-50"
        }`}
      >
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full transition-colors ${dragging ? "bg-indigo-100" : "bg-slate-100 group-hover:bg-indigo-50"}`}>
          <svg
            className={`h-7 w-7 transition-colors ${dragging ? "text-indigo-500" : "text-slate-400 group-hover:text-indigo-400"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-700">
          {dragging ? "Soltá el archivo aquí" : "Arrastrá un PDF o DOCX"}
        </p>
        <p className="mt-1 text-xs text-slate-400">o hacé clic para seleccionar</p>
        <p className="mt-3 text-xs text-slate-400">Máximo 20 MB · 200 páginas</p>
      </button>

      {state.status === "error" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">
          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="font-medium">Error al procesar</p>
            <p className="mt-0.5 text-red-600">{state.error}</p>
            <button onClick={onReset} className="mt-1 font-medium underline underline-offset-2 hover:text-red-800">
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={onChange}
        className="hidden"
      />
    </div>
  );
}
