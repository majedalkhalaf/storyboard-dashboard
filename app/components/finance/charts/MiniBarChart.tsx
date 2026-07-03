"use client";

import { useState } from "react";
import { fmtMoney } from "@/app/components/finance/format";

export interface BarPoint {
  label: string;
  value: number;
}

/** رسم أعمدة SVG يدوي بسيط لمقياس واحد (ربح شهري، نسبة تحصيل...) — محور واحد، تلميح عند المرور */
export default function MiniBarChart({ points, color = "var(--gold)", valueFormat = "money" }: { points: BarPoint[]; color?: string; valueFormat?: "money" | "percent" }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 560;
  const height = 200;
  const padX = 16;
  const padY = 20;
  const barGap = 10;

  const max = Math.max(1, ...points.map((p) => Math.abs(p.value)));
  const hasNegative = points.some((p) => p.value < 0);
  const baseline = hasNegative ? height / 2 : height - padY;
  const scale = hasNegative ? (height / 2 - padY) / max : (height - padY * 2) / max;

  const barWidth = points.length ? Math.min(28, (width - padX * 2) / points.length - barGap) : 0;
  const fmt = (v: number) => (valueFormat === "percent" ? `${Math.round(v)}%` : fmtMoney(v));

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <line x1={padX} x2={width - padX} y1={baseline} y2={baseline} stroke="var(--border)" strokeWidth={1} />
        {points.map((p, i) => {
          const x = padX + i * ((width - padX * 2) / points.length) + ((width - padX * 2) / points.length - barWidth) / 2;
          const barHeight = Math.max(2, Math.abs(p.value) * scale);
          const y = p.value >= 0 ? baseline - barHeight : baseline;
          return (
            <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={4}
                fill={p.value < 0 ? "var(--danger)" : color}
                opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.55}
              />
              <rect x={x - barGap / 2} y={0} width={barWidth + barGap} height={height} fill="transparent" />
              <text x={x + barWidth / 2} y={height + 14} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hoverIndex !== null && points[hoverIndex] && (
        <div
          className="card"
          style={{
            position: "absolute",
            top: 0,
            left: `calc(${((hoverIndex + 0.5) / points.length) * 100}% - 55px)`,
            padding: "6px 10px",
            fontSize: 12,
            fontWeight: 700,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {points[hoverIndex].label}: {fmt(points[hoverIndex].value)}
        </div>
      )}
    </div>
  );
}
