"use client";

import { ExternalLink, Video } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import type { EditorialScoreBreakdown } from "@/lib/db/schema";
import { youtubeId } from "@/lib/editorial/teaser";

interface EditorialContentProps {
  rating: string | null;
  summary: string | null;
  scoreBreakdown: EditorialScoreBreakdown | null;
  sourceVideos: { url: string; title?: string }[];
  basedOnLabel: string;
  seeVideoLabel: string;
  reviewLabel: string;
  scoreLabels: Record<keyof EditorialScoreBreakdown, string>;
  reviewedOn?: string | null;
}

const SCORE_ORDER: { key: keyof EditorialScoreBreakdown; color: string }[] = [
  { key: "design", color: "bg-blue-500" },
  { key: "comfort", color: "bg-emerald-500" },
  { key: "performance", color: "bg-amber-500" },
  { key: "technology", color: "bg-violet-500" },
  { key: "value", color: "bg-rose-500" },
];

export function EditorialContent({
  rating,
  summary,
  scoreBreakdown,
  sourceVideos,
  basedOnLabel,
  seeVideoLabel,
  reviewLabel,
  scoreLabels,
  reviewedOn,
}: EditorialContentProps) {
  const firstVideoId = sourceVideos.length > 0 ? youtubeId(sourceVideos[0].url) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 dark:text-white">{reviewLabel}</h2>
        {rating && (
          <span className="rounded-md bg-blue-600 px-2 py-1 text-sm font-bold text-white">
            {rating}
          </span>
        )}
      </div>
      {reviewedOn && <p className="text-xs text-slate-400">{reviewedOn}</p>}

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

      {summary && (
        <div className="prose prose-sm prose-slate max-w-none dark:prose-invert">
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      )}

      {sourceVideos.length > 0 && (
        <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
          {firstVideoId && (
            <div className="mb-3 aspect-video overflow-hidden rounded-md border border-slate-200 dark:border-slate-800">
              <iframe
                src={`https://www.youtube.com/embed/${firstVideoId}`}
                title={seeVideoLabel}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          )}
          <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
            <Video className="h-3.5 w-3.5" /> {basedOnLabel}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {sourceVideos.map((v) => {
              const id = youtubeId(v.url);
              return (
                <a
                  key={v.url}
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 rounded-md border border-slate-200 p-2 transition-colors hover:border-blue-400 dark:border-slate-700"
                >
                  {id ? (
                    <Image
                      src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
                      alt=""
                      width={80}
                      height={45}
                      loading="lazy"
                      unoptimized
                      className="h-[45px] w-20 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="flex h-[45px] w-20 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-400 dark:bg-slate-800">
                      <Video className="h-4 w-4" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 items-center gap-1 text-xs text-slate-600 group-hover:text-blue-600 dark:text-slate-300 dark:group-hover:text-blue-400">
                    <span className="truncate">{v.title ?? seeVideoLabel}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
