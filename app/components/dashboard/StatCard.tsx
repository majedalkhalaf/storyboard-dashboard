import Icon, { type IconName } from "@/app/components/ui/Icon";

export default function StatCard({
  label,
  value,
  delta,
  deltaTone = "up",
  icon,
  color,
}: {
  label: string;
  value: string | number;
  delta?: string | null;
  deltaTone?: "up" | "down";
  icon: IconName;
  color: string;
}) {
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
            color: deltaTone === "up" ? "#22C55E" : "#EF4444",
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
