"use client";

import { useId, useState } from "react";

interface Point {
  label: string;
  value: number;
}

// رسم خطي بسيط (بدون مكتبات خارجية) يوضّح حجم النشاط اليومي آخر 7 أيام.
export default function ActivityTrendChart({ points }: { points: Point[] }) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 560;
  const height = 200;
  const padX = 24;
  const padY = 20;
  const max = Math.max(1, ...points.map((p) => p.value));

  const stepX = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = padX + i * stepX;
    const y = padY + (1 - p.value / max) * (height - padY * 2);
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x ?? padX} ${height - padY} L ${padX} ${height - padY} Z`;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={padX}
            x2={width - padX}
            y1={padY + f * (height - padY * 2)}
            y2={padY + f * (height - padY * 2)}
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--gold)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {coords.map((c, i) => (
          <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
            <circle
              cx={c.x}
              cy={c.y}
              r={hoverIndex === i ? 6 : 4}
              fill="var(--bg-card)"
              stroke="var(--gold)"
              strokeWidth={2}
              style={{ transition: "r 0.15s" }}
            />
            <rect x={c.x - stepX / 2} y={0} width={stepX || width} height={height} fill="transparent" />
            <text x={c.x} y={height} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
              {c.label}
            </text>
          </g>
        ))}
      </svg>

      {hoverIndex !== null && coords[hoverIndex] && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: Math.max(coords[hoverIndex].y - 42, 0),
            left: `calc(${(coords[hoverIndex].x / width) * 100}% - 30px)`,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 700,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {coords[hoverIndex].label}: {coords[hoverIndex].value}
        </div>
      )}
    </div>
  );
}
