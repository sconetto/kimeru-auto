"use client";

import { formatBRL, formatPercent } from "@/lib/format";

interface HistoryPoint {
  referenceMonth: string;
  price: number;
  recordedAt: Date;
}

interface Props {
  history: HistoryPoint[];
  depreciation12m: number | null;
}

/**
 * Lightweight SVG price history chart (no chart library dependency).
 * Renders a line chart when 3+ points exist; otherwise a simple list.
 */
export function PriceHistoryChart({ history, depreciation12m }: Props) {
  if (history.length < 2) {
    return <p className="text-sm text-slate-500">Histórico de preços em construção.</p>;
  }

  const width = 600;
  const height = 180;
  const pad = { top: 16, right: 16, bottom: 28, left: 48 };
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const points = history.map((h, i) => ({
    x: pad.left + (i / (history.length - 1)) * (width - pad.left - pad.right),
    y: pad.top + (1 - (h.price - min) / range) * (height - pad.top - pad.bottom),
    h,
  }));

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label="Histórico de preços FIPE"
      >
        {/* Y axis labels */}
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + t * (height - pad.top - pad.bottom);
          const price = max - t * range;
          return (
            <text
              key={t}
              x={pad.left - 8}
              y={y + 4}
              textAnchor="end"
              className="fill-slate-400 text-[10px]"
            >
              {formatBRL(price)}
            </text>
          );
        })}
        {/* Line */}
        <path
          d={path}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Points */}
        {points.map((p, i) => (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: positional chart points
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="#2563eb"
          />
        ))}
        {/* X labels (first/last) */}
        <text
          x={points[0].x}
          y={height - 8}
          textAnchor="start"
          className="fill-slate-400 text-[10px]"
        >
          {points[0].h.referenceMonth}
        </text>
        <text
          x={points[points.length - 1].x}
          y={height - 8}
          textAnchor="end"
          className="fill-slate-400 text-[10px]"
        >
          {points[points.length - 1].h.referenceMonth}
        </text>
      </svg>

      {depreciation12m !== null && (
        <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-sm dark:bg-slate-800">
          <span className="text-slate-600 dark:text-slate-300">Depreciação 12 meses:</span>
          <span
            className={`font-semibold ${depreciation12m <= 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
          >
            {formatPercent(depreciation12m)}
          </span>
        </div>
      )}
    </div>
  );
}
