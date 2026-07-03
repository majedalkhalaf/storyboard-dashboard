"use client";

import { useState } from "react";
import { fmtMoney } from "@/app/components/finance/format";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * دونات SVG يدوي (بلا مكتبة رسوم) — يطابق أسلوب RevenueExpenseChart.tsx الحالي.
 * فجوة 2px بلون الخلفية بين كل قطعة وأخرى، تلميح تفاعلي عند المرور، ووسيلة إيضاح
 * دائمة الظهور مع تسميات مباشرة للقيم — لا اعتماد على اللون وحده لتمييز الفئات.
 */
export default function DonutChart({ slices, size = 180, valueFormat = "money" }: { slices: DonutSlice[]; size?: number; valueFormat?: "money" | "count" }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const fmt = (v: number) => (valueFormat === "money" ? fmtMoney(v) : String(v));

  const radius = size / 2;
  const stroke = size * 0.22;
  const innerR = radius - stroke / 2;
  const circumference = 2 * Math.PI * innerR;
  const gapDeg = total > 0 ? 2 : 0;

  interface Segment extends DonutSlice {
    index: number;
    dash: number;
    offset: number;
    fraction: number;
    startDeg: number;
    deg: number;
  }

  const segments = slices.reduce<Segment[]>((acc, s, i) => {
    const prevEnd = acc.length ? acc[acc.length - 1].startDeg + acc[acc.length - 1].deg : -90;
    const fraction = total > 0 ? s.value / total : 0;
    const deg = fraction * 360;
    const dash = Math.max(0, (deg - gapDeg) / 360) * circumference;
    const offset = -((prevEnd + 90) / 360) * circumference;
    acc.push({ ...s, index: i, dash, offset, fraction, startDeg: prevEnd, deg });
    return acc;
  }, []);

  if (total === 0) {
    return <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: 20 }}>لا توجد بيانات كافية</div>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(0deg)" }}>
          {segments.map((seg) => (
            <circle
              key={seg.index}
              cx={radius}
              cy={radius}
              r={innerR}
              fill="none"
              stroke={seg.color}
              strokeWidth={hoverIndex === seg.index ? stroke + 4 : stroke}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={seg.offset}
              style={{ transition: "stroke-width .12s" }}
              onMouseEnter={() => setHoverIndex(seg.index)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          ))}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          {hoverIndex !== null ? (
            <>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{segments[hoverIndex].label}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{Math.round(segments[hoverIndex].fraction * 100)}%</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 800 }}>{fmt(total)}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>الإجمالي</div>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 140 }}>
        {segments.map((seg) => (
          <div
            key={seg.index}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "default", opacity: hoverIndex !== null && hoverIndex !== seg.index ? 0.5 : 1 }}
            onMouseEnter={() => setHoverIndex(seg.index)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <span style={{ width: 9, height: 9, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
            <span style={{ flex: 1, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{seg.label}</span>
            <span style={{ fontWeight: 700 }}>{Math.round(seg.fraction * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
