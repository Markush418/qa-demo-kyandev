import type { UploadResponse } from "../lib/api";

interface Props {
  doc: UploadResponse;
  onReset: () => void;
}

export function DocumentInfo({ doc, onReset }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
          <svg
            className="h-4 w-4 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{doc.filename}</p>
          <p className="text-xs text-slate-500">
            {doc.pageCount} {doc.pageCount === 1 ? "página" : "páginas"} · {doc.chunkCount} fragmentos indexados
          </p>
        </div>
      </div>
      <button
        onClick={onReset}
        className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
      >
        Subir otro
      </button>
    </div>
  );
}
