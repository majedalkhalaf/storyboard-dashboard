import Icon, { type IconName } from "@/app/components/ui/Icon";

export default function StatCard({
  label,
  value,
  delta,
  deltaTone = "up",
  icon,
  color,
  compact = false,
}: {
  label: string;
  value: string | number;
  delta?: string | null;
  deltaTone?: "up" | "down";
  icon: IconName;
  color: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="stat-card" style={{ padding: 10, flexShrink: 0 }}>
        <span style={{ color, display: "inline-flex", background: `${color}1a`, padding: 6, borderRadius: 8 }}>
          <Icon name={icon} size={14} />
        </span>
        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 6 }}>{value}</div>
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1, whiteSpace: "nowrap" }}>{label}</div>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <span style={{ color, display: "inline-flex", background: `${color}1a`, padding: 8, borderRadius: 10 }}>
        <Icon name={icon} size={18} />
      </span>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
      {delta && (
        <div
          style={{
            fontSize: 11,
            color: deltaTone === "up" ? "#1DB954" : "#EF4444",
            marginTop: 6,
            fontWeight: 700,
          }}
        >
          {delta}
        </div>
      )}
    </div>
  );
}
