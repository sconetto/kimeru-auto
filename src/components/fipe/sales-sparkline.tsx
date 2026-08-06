"use client";

interface Props {
  data: { month: number; year: number; unitsSold: number }[];
}

/** Minimal SVG sparkline for monthly sales trend. */
export function SalesSparkline({ data }: Props) {
  if (data.length < 2) {
    return <p className="text-xs text-slate-500">Dados insuficientes para gráfico.</p>;
  }

  const width = 240;
  const height = 60;
  const pad = { top: 4, right: 4, bottom: 4, left: 4 };
  const values = data.map((d) => d.unitsSold);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * (width - pad.left - pad.right),
    y: pad.top + (1 - (d.unitsSold - min) / range) * (height - pad.top - pad.bottom),
  }));

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${path} L${points[points.length - 1].x.toFixed(1)},${height - pad.bottom} L${points[0].x.toFixed(1)},${height - pad.bottom} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label="Tendência de vendas mensais"
    >
      <path d={area} fill="#2563eb" opacity="0.1" />
      <path
        d={path}
        fill="none"
        stroke="#2563eb"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
