import Icon, { type IconName } from "@/app/components/ui/Icon";
import { pctChange } from "@/app/lib/pct-change";

export default function FinanceKpiCard({
  icon,
  label,
  value,
  color,
  current,
  previous,
  changeLabel = "عن الفترة السابقة",
}: {
  icon: IconName;
  label: string;
  value: string;
  color: string;
  /** إن مُرّرا، يُحسب مؤشر التغيّر تلقائياً — يُترك بلا مؤشر لأي KPI غير قابل للمقارنة الشهرية بصدق */
  current?: number;
  previous?: number;
  changeLabel?: string;
}) {
  const change = current != null && previous != null ? pctChange(current, previous) : null;

  return (
    <div className="stat-card">
      <span style={{ color, display: "inline-flex" }}>
        <Icon name={icon} size={20} />
      </span>
      <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
      {change != null && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, color: change >= 0 ? "#1DB954" : "#EF4444" }}>
          <Icon name={change >= 0 ? "trendUp" : "trendDown"} size={11} />
          {Math.abs(Math.round(change))}% {changeLabel}
        </div>
      )}
    </div>
  );
}
