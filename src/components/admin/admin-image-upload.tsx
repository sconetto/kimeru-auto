"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

interface AdminImageUploadProps {
  name: string;
  label: string;
  value?: string | null;
  onChange?: (url: string | null) => void;
}

/**
 * Image upload field for admin forms. Uploads to /api/admin/media/upload
 * and stores the returned URL in the hidden field (or reports via onChange).
 */
export function AdminImageUpload({ name, label, value, onChange }: AdminImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(value ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/media/upload", { method: "POST", body: formData });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Falha no upload");
        return;
      }
      setUrl(body.url);
      onChange?.(body.url);
      if (inputRef.current) inputRef.current.value = "";
    } catch {
      setError("Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <input type="hidden" name={name} value={url ?? ""} />
      {url ? (
        <div className="flex items-center gap-3">
          <img src={url} alt="" className="h-16 w-24 rounded-md border border-slate-700 object-cover" />
          <button
            type="button"
            onClick={() => {
              setUrl(null);
              onChange?.(null);
            }}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400"
            aria-label={`Remover ${label}`}
            title="Remover imagem"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-700 px-3 py-4 text-sm text-slate-400 hover:border-blue-500 hover:text-blue-400">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {uploading ? "Enviando…" : "Enviar imagem (JPG, PNG, WebP, AVIF — até 5 MB)"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </label>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
