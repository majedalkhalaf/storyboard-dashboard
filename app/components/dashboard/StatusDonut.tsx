"use client";

import { useState } from "react";

interface Segment {
  label: string;
  value: number;
  color: string;
}

// دونات بسيط (SVG بدون مكتبات) لتوزيع المشاريع حسب الحالة، بنفس ألوان
// شارات الحالة المستخدمة بكل مكان آخر بالتطبيق (لون واحد لكل حالة دائماً).
export default function StatusDonut({ segments, centerLabel }: { segments: Segment[]; centerLabel: string }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const [hover, setHover] = useState<number | null>(null);

  const size = 180;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const arcs = segments
    .filter((s) => s.value > 0)
    .reduce<{ label: string; value: number; color: string; dash: number; gap: number; offset: number; index: number }[]>(
      (acc, seg, i) => {
        const fraction = total > 0 ? seg.value / total : 0;
        const dash = fraction * circumference;
        const prevOffset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
        acc.push({ ...seg, dash, gap: circumference - dash, offset: prevOffset, index: i });
        return acc;
      },
      []
    );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={stroke} />
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={hover === arc.index ? stroke + 4 : stroke}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
              onMouseEnter={() => setHover(arc.index)}
              onMouseLeave={() => setHover(null)}
              style={{ transition: "stroke-width 0.15s", cursor: "pointer" }}
            >
              <title>
                {arc.label}: {arc.value}
              </title>
            </circle>
          ))}
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800 }}>{total}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{centerLabel}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 140 }}>
        {segments.map((seg, i) => (
          <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: hover !== null && hover !== i ? 0.5 : 1 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: seg.color, flexShrink: 0 }} />
            <span style={{ color: "var(--text-secondary)", flex: 1 }}>{seg.label}</span>
            <span style={{ fontWeight: 700 }}>{seg.value}</span>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
              ({total > 0 ? Math.round((seg.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
