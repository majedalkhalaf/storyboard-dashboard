"use client";

import { useId, useState } from "react";
import { fmtMoney } from "@/app/components/finance/format";

interface Point {
  label: string;
  revenue: number;
  expenses: number;
}

export default function RevenueExpenseChart({ points }: { points: Point[] }) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 560;
  const height = 220;
  const padX = 24;
  const padY = 20;
  const max = Math.max(1, ...points.map((p) => Math.max(p.revenue, p.expenses)));

  const stepX = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: padX + i * stepX,
    revenueY: padY + (1 - p.revenue / max) * (height - padY * 2),
    expensesY: padY + (1 - p.expenses / max) * (height - padY * 2),
    ...p,
  }));

  const linePath = (key: "revenueY" | "expensesY") => coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c[key]}`).join(" ");
  const areaPath = coords.length
    ? `${linePath("revenueY")} L ${coords[coords.length - 1].x} ${height - padY} L ${padX} ${height - padY} Z`
    : "";

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--success)", display: "inline-block" }} />
          الإيرادات
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--danger)", display: "inline-block" }} />
          المصروفات
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--success)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={padX} x2={width - padX} y1={padY + f * (height - padY * 2)} y2={padY + f * (height - padY * 2)} stroke="var(--border)" strokeWidth={1} />
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath("revenueY")} fill="none" stroke="var(--success)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={linePath("expensesY")} fill="none" stroke="var(--danger)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 4" />

        {coords.map((c, i) => (
          <g key={i} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
            <circle cx={c.x} cy={c.revenueY} r={hoverIndex === i ? 5 : 3} fill="var(--bg-card)" stroke="var(--success)" strokeWidth={2} />
            <circle cx={c.x} cy={c.expensesY} r={hoverIndex === i ? 5 : 3} fill="var(--bg-card)" stroke="var(--danger)" strokeWidth={2} />
            <rect x={c.x - stepX / 2} y={0} width={stepX || width} height={height} fill="transparent" />
            <text x={c.x} y={height + 14} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
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
            top: Math.max(Math.min(coords[hoverIndex].revenueY, coords[hoverIndex].expensesY) - 58, 0),
            left: `calc(${(coords[hoverIndex].x / width) * 100}% - 60px)`,
            padding: "8px 12px",
            fontSize: 12,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{coords[hoverIndex].label}</div>
          <div style={{ color: "var(--success)" }}>الإيرادات: {fmtMoney(coords[hoverIndex].revenue)}</div>
          <div style={{ color: "var(--danger)" }}>المصروفات: {fmtMoney(coords[hoverIndex].expenses)}</div>
        </div>
      )}
    </div>
  );
}
