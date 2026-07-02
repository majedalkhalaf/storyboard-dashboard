import type { CSSProperties } from "react";
import Icon, { type IconName } from "@/app/components/ui/Icon";

const FEATURES: { icon: IconName; title: string; subtitle: string }[] = [
  { icon: "shield", title: "أمان عالي", subtitle: "حماية بياناتك بأعلى المعايير" },
  { icon: "zap", title: "أداء سريع", subtitle: "تجربة سلسة بدون تأخير" },
  { icon: "barChart", title: "تقارير ذكية", subtitle: "تحليلات دقيقة ورؤى واضحة" },
];

const glassCard: CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 16,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(var(--gold-rgb), 0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--gold-light)",
  backdropFilter: "blur(6px)",
};

export default function AuthShowcase() {
  return (
    <div
      className="auth-showcase"
      style={{
        position: "relative",
        background: "linear-gradient(160deg, #090909 0%, #1A1410 55%, #090909 100%)",
        padding: "44px 40px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -80,
          insetInlineStart: -60,
          width: 240,
          height: 240,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(var(--gold-rgb), 0.35), transparent 70%)",
          filter: "blur(10px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -100,
          insetInlineEnd: -80,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(var(--gold-rgb), 0.16), transparent 70%)",
          filter: "blur(10px)",
        }}
      />

      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: 20,
              color: "#0A0A0B",
              flexShrink: 0,
            }}
          >
            ن
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#F0EDE8" }}>نظام إدارة الإنتاج</div>
            <div style={{ fontSize: 10.5, letterSpacing: "0.08em", color: "var(--gold-light)" }}>
              PRODUCTION MANAGEMENT SYSTEM
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "36px 0 30px" }}>
          <div style={{ ...glassCard, transform: "rotate(-6deg)" }}>
            <Icon name="equipment" size={28} />
          </div>
          <div style={{ ...glassCard, width: 80, height: 80, transform: "translateY(-10px)" }}>
            <Icon name="video" size={34} />
          </div>
          <div style={{ ...glassCard, transform: "rotate(6deg)" }}>
            <Icon name="image" size={28} />
          </div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#F0EDE8", lineHeight: 1.5 }}>
          إدارة إنتاجك باحترافية
        </h2>
        <p style={{ fontSize: 13.5, color: "#9A978C", marginTop: 10, lineHeight: 1.8, maxWidth: 320 }}>
          من التخطيط وحتى التسليم، كل ما تحتاجه لإدارة مشاريعك الإبداعية في مكان واحد.
        </p>
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", gap: 20, flexWrap: "wrap" }}>
        {FEATURES.map((f) => (
          <div key={f.title} style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 130 }}>
            <span
              style={{
                color: "var(--gold)",
                background: "rgba(var(--gold-rgb), 0.15)",
                padding: 8,
                borderRadius: 10,
                flexShrink: 0,
                display: "inline-flex",
              }}
            >
              <Icon name={f.icon} size={17} />
            </span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#F0EDE8" }}>{f.title}</div>
              <div style={{ fontSize: 10.5, color: "#8A8A9A" }}>{f.subtitle}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
