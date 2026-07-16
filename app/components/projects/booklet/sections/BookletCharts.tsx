import type { PresentationTheme } from "@/app/lib/presentation-themes";

// رسوم بيانية SVG خفيفة بلا أي مكتبة خارجية — بلون هوية واحد فقط (theme.accent)
// بتدرّجات شفافية مختلفة بدل ألوان متعددة (لا بنفسجي، لا "قوس قزح")، وكل قيمة
// مكتوبة كنص مباشر بجانب عنصرها بدل الاعتماد على اللون وحده لنقل المعنى.

export function DonutChart({
  percentage,
  theme,
  size = 130,
  label,
}: {
  percentage: number;
  theme: PresentationTheme;
  size?: number;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const stroke = Math.round(size * 0.09);
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={theme.border} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={theme.accent}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.2, fontWeight: 900, color: theme.accent }}>{clamped}%</span>
        {label && <span style={{ fontSize: 10.5, color: theme.muted, marginTop: 2, textAlign: "center", maxWidth: size * 0.8 }}>{label}</span>}
      </div>
    </div>
  );
}

export function BarChart({
  items,
  theme,
  height = 150,
}: {
  items: { label: string; value: number; max?: number }[];
  theme: PresentationTheme;
  height?: number;
}) {
  const safeItems = items.length ? items : [{ label: "لا توجد بيانات", value: 0 }];
  const max = Math.max(...safeItems.map((i) => i.max ?? i.value), 1);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height, width: "100%", overflowX: "auto" }}>
      {safeItems.map((it, i) => {
        const h = Math.max(4, (it.value / max) * (height - 34));
        const opacity = 0.5 + 0.5 * (1 - (i % 3) * 0.18);
        return (
          <div key={`${it.label}-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 0 54px", gap: 6, minWidth: 54 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: theme.text }}>{it.value}</div>
            <div style={{ width: "100%", maxWidth: 36, height: h, borderRadius: 6, background: theme.accent, opacity }} />
            <div style={{ fontSize: 10, color: theme.muted, textAlign: "center", lineHeight: 1.3 }}>{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// شريط تقدّم أفقي بسيط (مستخدَم في بطاقات المراحل/المهام) — نفس مبدأ الألوان أعلاه.
export function ProgressBar({ percentage, theme, height = 6 }: { percentage: number; theme: PresentationTheme; height?: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  return (
    <div style={{ height, borderRadius: height / 2, background: theme.border, overflow: "hidden", width: "100%" }}>
      <div style={{ height: "100%", width: `${clamped}%`, background: theme.accent, borderRadius: height / 2 }} />
    </div>
  );
}
