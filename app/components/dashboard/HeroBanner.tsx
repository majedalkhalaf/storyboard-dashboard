import type { CSSProperties } from "react";
import Icon, { type IconName } from "@/app/components/ui/Icon";

const ITEMS: { icon: IconName; rotate: number; size: number; offset?: number }[] = [
  { icon: "video", rotate: -8, size: 26 },
  { icon: "equipment", rotate: 5, size: 34, offset: -8 },
  { icon: "image", rotate: -4, size: 24 },
];

const glassCard: CSSProperties = {
  borderRadius: 14,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(var(--gold-rgb), 0.25)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--gold-light)",
  backdropFilter: "blur(6px)",
};

export default function HeroBanner() {
  return (
    <div
      className="hero-banner"
      style={{
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        background: "linear-gradient(135deg, #0D0D0D 0%, #1A1410 60%, #0D0D0D 100%)",
        border: "1px solid var(--border)",
        minHeight: 170,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 30% 30%, rgba(var(--gold-rgb), 0.22), transparent 60%)",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 14 }}>
        {ITEMS.map((it, i) => (
          <div
            key={i}
            style={{
              ...glassCard,
              width: it.size + 40,
              height: it.size + 40,
              transform: `rotate(${it.rotate}deg) translateY(${it.offset ?? 0}px)`,
            }}
          >
            <Icon name={it.icon} size={it.size} />
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 14,
          insetInlineStart: 18,
          fontSize: 11,
          letterSpacing: "0.1em",
          color: "var(--gold-light)",
          fontWeight: 700,
        }}
      >
        DIRECTOR&apos;S CUT
      </div>
    </div>
  );
}
