"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import type { RadarScores } from "@/lib/compare/scoring";

interface Props {
  scores: RadarScores;
  carNames: string[];
  colors?: string[];
}

const DEFAULT_COLORS = ["#2563eb", "#059669", "#d97706"];

/**
 * Radar (spider) chart comparing cars across the main spec dimensions.
 * Pure SVG — no chart library. Hover any axis label for a per-car
 * score breakdown tooltip.
 */
export function RadarChart({ scores, carNames, colors = DEFAULT_COLORS }: Props) {
  const t = useTranslations("compare");
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ dimIdx: number; x: number; y: number } | null>(null);

  const { pointsByCar, gridPoints, center, radius } = useMemo(() => {
    const dimCount = scores.dimensions.length;
    const width = 460;
    const height = 350;
    const center = { x: width / 2, y: height / 2 + 10 };
    const radius = 128;

    const angleFor = (i: number) => (Math.PI * 2 * i) / dimCount - Math.PI / 2;
    const pointAt = (angle: number, r: number) => ({
      x: center.x + Math.cos(angle) * r,
      y: center.y + Math.sin(angle) * r,
    });

    // Grid rings at 25/50/75/100
    const gridPoints = [25, 50, 75, 100].map((level) =>
      Array.from({ length: dimCount }, (_, i) => pointAt(angleFor(i), (radius * level) / 100)),
    );

    const pointsByCar = scores.scores.map((row) =>
      row.map((score, i) =>
        pointAt(angleFor(i), (radius * Math.max(0, Math.min(100, score))) / 100),
      ),
    );

    return { pointsByCar, gridPoints, center, radius };
  }, [scores]);

  const dimCount = scores.dimensions.length;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!tooltip) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip((t) => (t ? { ...t, x: e.clientX - rect.left, y: e.clientY - rect.top } : null));
    },
    [tooltip],
  );

  const enter = useCallback((dimIdx: number, e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    setTooltip({
      dimIdx,
      x: rect ? e.clientX - rect.left : 0,
      y: rect ? e.clientY - rect.top : 0,
    });
  }, []);

  const leave = useCallback(() => setTooltip(null), []);

  return (
    <div ref={containerRef} className="relative">
      <svg
        viewBox="0 0 480 370"
        className="mx-auto w-full max-w-[480px]"
        role="img"
        aria-label={t("radarAria")}
        onMouseMove={handleMouseMove}
      >
        {/* Grid rings */}
        {gridPoints.map((ring, ri) => (
          <polygon
            key={`ring-${[25, 50, 75, 100][ri]}`}
            points={ring.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={ri === gridPoints.length - 1 ? "#94a3b8" : "#e2e8f0"}
            strokeWidth="1"
            className="dark:stroke-slate-700"
          />
        ))}

        {/* Axis lines + labels */}
        {scores.dimensions.map((dim, i) => {
          const angle = (Math.PI * 2 * i) / dimCount - Math.PI / 2;
          const end = {
            x: center.x + Math.cos(angle) * radius,
            y: center.y + Math.sin(angle) * radius,
          };
          const labelPos = {
            x: center.x + Math.cos(angle) * (radius + 30),
            y: center.y + Math.sin(angle) * (radius + 30),
          };
          const anchor =
            Math.abs(Math.cos(angle)) < 0.3 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
          const fboxX =
            anchor === "end" ? labelPos.x - 120 : anchor === "start" ? labelPos.x : labelPos.x - 60;
          return (
            <g key={dim.id}>
              <line
                x1={center.x}
                y1={center.y}
                x2={end.x}
                y2={end.y}
                stroke="#e2e8f0"
                strokeWidth="1"
                className="dark:stroke-slate-700"
              />
              <foreignObject x={fboxX} y={labelPos.y - 10} width="120" height="20">
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      anchor === "middle"
                        ? "center"
                        : anchor === "start"
                          ? "flex-start"
                          : "flex-end",
                  }}
                >
                  <button
                    type="button"
                    aria-label={dim.label}
                    className="cursor-help border-0 bg-transparent p-0 text-[11px] text-slate-500 hover:text-blue-500 dark:text-slate-400 dark:hover:text-blue-400"
                    onMouseEnter={(e) => enter(i, e)}
                    onMouseLeave={leave}
                    onFocus={(e) => enter(i, e as unknown as React.MouseEvent)}
                    onBlur={leave}
                  >
                    {dim.label}
                  </button>
                </div>
              </foreignObject>
            </g>
          );
        })}

        {/* Per-car polygons */}
        {pointsByCar.map((points, carIdx) => (
          <g key={carNames[carIdx]}>
            <polygon
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill={colors[carIdx % colors.length]}
              fillOpacity="0.15"
              stroke={colors[carIdx % colors.length]}
              strokeWidth="2"
            />
            {points.map((p) => (
              <circle
                key={`${carNames[carIdx]}-${p.x}-${p.y}`}
                cx={p.x}
                cy={p.y}
                r="3"
                fill={colors[carIdx % colors.length]}
              />
            ))}
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-lg"
          style={{
            left: Math.min(tooltip.x + 12, (containerRef.current?.clientWidth ?? 480) - 170),
            top: Math.max(tooltip.y - 10, 4),
          }}
        >
          <p className="mb-1 font-semibold text-white">{scores.dimensions[tooltip.dimIdx].label}</p>
          {scores.scores.map((row, ci) => (
            <p key={carNames[ci]} className="flex items-center gap-1.5 text-slate-300">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: colors[ci % colors.length] }}
              />
              {carNames[ci]}: {row[tooltip.dimIdx]}
            </p>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap justify-center gap-4">
        {carNames.map((name, i) => (
          <span
            key={name}
            className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
          >
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
