"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

interface FileResult {
  name: string;
  status: "pending" | "success" | "error";
  message?: string;
}

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FileResult[]>([]);

  async function uploadOne(file: File): Promise<FileResult> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/statements", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { name: file.name, status: "error", message: data.error ?? "No se pudo subir" };
    }
    if (data.status === "ERROR") {
      return {
        name: file.name,
        status: "error",
        message: data.errorMessage ?? "No se pudo procesar automáticamente",
      };
    }
    return {
      name: file.name,
      status: "success",
      message: `${data.transactionCount} transacciones detectadas`,
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;

    setLoading(true);
    setResults(files.map((f) => ({ name: f.name, status: "pending" })));

    // Uploads secuenciales (no en paralelo): SQLite no maneja bien escrituras
    // concurrentes, y así el usuario ve el progreso archivo por archivo.
    for (let i = 0; i < files.length; i++) {
      const result = await uploadOne(files[i]);
      setResults((prev) => prev.map((r, idx) => (idx === i ? result : r)));
    }

    setLoading(false);
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-black/10 dark:border-white/15 p-4"
    >
      <label className="text-sm font-medium">
        Subir statements (PDF, Excel o CSV) — puedes elegir varios a la vez
      </label>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.xls,.csv"
        onChange={(e) => {
          setFiles(Array.from(e.target.files ?? []));
          setResults([]);
        }}
        className="hidden"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded border border-black/15 dark:border-white/20 px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5"
        >
          Elegir archivos
        </button>
        <span className="text-sm opacity-70">
          {files.length > 0
            ? `${files.length} archivo${files.length === 1 ? "" : "s"} seleccionado${files.length === 1 ? "" : "s"}`
            : "Ningún archivo seleccionado"}
        </span>
      </div>

      <button
        type="submit"
        disabled={files.length === 0 || loading}
        className="w-fit rounded bg-foreground text-background px-4 py-2 text-sm disabled:opacity-50"
      >
        {loading
          ? `Procesando (${results.filter((r) => r.status !== "pending").length}/${files.length})...`
          : "Subir"}
      </button>

      {results.length > 0 && (
        <ul className="text-sm space-y-1">
          {results.map((r, i) => (
            <li
              key={`${r.name}-${i}`}
              className={
                r.status === "error"
                  ? "text-red-600"
                  : r.status === "success"
                    ? "text-green-600"
                    : "opacity-50"
              }
            >
              {r.name}: {r.status === "pending" ? "esperando..." : r.message}
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
