"use client";

import { ArrowRight } from "lucide-react";
import type { EditorialScoreBreakdown } from "@/lib/db/schema";
import { Link } from "@/lib/i18n/navigation";

interface EditorialScoreSummaryProps {
  modelSlug: string;
  rating: string | null;
  scoreBreakdown: EditorialScoreBreakdown | null;
  reviewLabel: string;
  readFullLabel: string;
  scoreLabels: Record<keyof EditorialScoreBreakdown, string>;
}

const SCORE_ORDER: { key: keyof EditorialScoreBreakdown; color: string }[] = [
  { key: "design", color: "bg-blue-500" },
  { key: "comfort", color: "bg-emerald-500" },
  { key: "performance", color: "bg-amber-500" },
  { key: "technology", color: "bg-violet-500" },
  { key: "value", color: "bg-rose-500" },
];

/** Compact editorial box for the car detail page: rating + score bars + link. */
export function EditorialScoreSummary({
  modelSlug,
  rating,
  scoreBreakdown,
  reviewLabel,
  readFullLabel,
  scoreLabels,
}: EditorialScoreSummaryProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 dark:text-white">{reviewLabel}</h2>
        {rating && (
          <span className="rounded-md bg-blue-600 px-2 py-1 text-sm font-bold text-white">
            {rating}
          </span>
        )}
      </div>

      {scoreBreakdown && (
        <div className="space-y-2">
          {SCORE_ORDER.map(({ key, color }) => {
            const value = scoreBreakdown[key] ?? 0;
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-xs text-slate-500">{scoreLabels[key]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${(value / 5) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-medium text-slate-600 dark:text-slate-300">
                  {value.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href={`/car/${modelSlug}/review`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        {readFullLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
