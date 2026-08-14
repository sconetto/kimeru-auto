"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

/* ------------------------------------------------------------------ */
/* AdminSearch — debounced URL-param text search                       */
/* ------------------------------------------------------------------ */

export function AdminSearch({
  param = "q",
  placeholder = "Buscar…",
}: {
  param?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlValue = searchParams.get(param) ?? "";
  const [value, setValue] = useState(urlValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local state when the URL param changes (navigation, back/forward).
  useEffect(() => {
    setValue(urlValue);
  }, [urlValue]);

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (next) params.set(param, next);
        else params.delete(param);
        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
      });
    }, 300);
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-64 rounded-md border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
        aria-label={placeholder}
      />
      {isPending && <span className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AdminPagination — URL-param page navigation                         */
/* ------------------------------------------------------------------ */

export function AdminPagination({
  page,
  totalPages,
  total,
  param = "page",
}: {
  page: number;
  totalPages: number;
  total: number;
  param?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(param, String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3 text-sm text-slate-400">
      <span>
        {total} registro(s) · página {page} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-40"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Anterior
        </button>
        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 disabled:opacity-40"
          aria-label="Próxima página"
        >
          Próxima <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AdminEmptyState                                                     */
/* ------------------------------------------------------------------ */

export function AdminEmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <p className="text-sm text-slate-500">{message}</p>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AdminBadge                                                          */
/* ------------------------------------------------------------------ */

export function AdminBadge({
  tone,
  children,
}: {
  tone: "green" | "amber" | "blue" | "gray" | "red";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    green: "bg-emerald-500/20 text-emerald-400",
    amber: "bg-amber-500/20 text-amber-400",
    blue: "bg-blue-500/20 text-blue-400",
    red: "bg-red-500/20 text-red-400",
    gray: "bg-slate-700 text-slate-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
  );
}
