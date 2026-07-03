import Icon, { type IconName } from "@/app/components/ui/Icon";
import type { ClientsDirectoryStats } from "@/app/lib/clients-directory";

// لا "تغيّر شهري %" هنا لأنه يتطلب لقطات تاريخية غير موجودة في المخطط الحالي —
// بدلاً من رقم وهمي، تُعرض نسبة/عدد حقيقي فقط عند إمكان حسابه من البيانات الفعلية.
export default function ClientsStatsRow({ stats }: { stats: ClientsDirectoryStats }) {
  const cards: { label: string; value: string; icon: IconName; color: string; sub?: string; progress?: number }[] = [
    { label: "إجمالي العملاء", value: String(stats.totalClients), icon: "clients", color: "#CE902F" },
    {
      label: "عملاء نشطون",
      value: String(stats.activeClients),
      icon: "userPlus",
      color: "#22C55E",
      sub: stats.totalClients ? `${Math.round((stats.activeClients / stats.totalClients) * 100)}% من الإجمالي` : undefined,
      progress: stats.totalClients ? (stats.activeClients / stats.totalClients) * 100 : 0,
    },
    { label: "إجمالي المشاريع", value: String(stats.totalProjects), icon: "projects", color: "#3B82F6" },
    { label: "إجمالي قيمة العقود", value: `${stats.totalContractsValue.toLocaleString()} ر.س`, icon: "contracts", color: "#CE902F" },
    { label: "إجمالي الفواتير", value: `${stats.totalInvoices.toLocaleString()} ر.س`, icon: "invoices", color: "#06B6D4" },
    { label: "إجمالي المدفوعات", value: `${stats.totalPaid.toLocaleString()} ر.س`, icon: "payments", color: "#22C55E" },
    { label: "المبالغ المتبقية", value: `${stats.totalRemaining.toLocaleString()} ر.س`, icon: "money", color: "#EF4444" },
    {
      label: "متوسط إنجاز المشاريع",
      value: `${stats.avgCompletion}%`,
      icon: "barChart",
      color: "#CE902F",
      progress: stats.avgCompletion,
    },
    { label: "مشاريع تحت التنفيذ", value: String(stats.inProgressProjects), icon: "clock", color: "#F59E0B" },
    { label: "مشاريع متأخرة", value: String(stats.lateProjects), icon: "warning", color: "#EF4444" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
      {cards.map((c) => (
        <div key={c.label} className="stat-card">
          <span style={{ color: c.color, display: "inline-flex", background: `${c.color}1a`, padding: 8, borderRadius: 10 }}>
            <Icon name={c.icon} size={18} />
          </span>
          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 12 }}>{c.value}</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{c.label}</div>
          {c.sub && <div style={{ fontSize: 11, color: c.color, marginTop: 6, fontWeight: 700 }}>{c.sub}</div>}
          {c.progress != null && (
            <div className="progress-bar" style={{ height: 4, marginTop: 8 }}>
              <div className="progress-fill" style={{ width: `${Math.min(100, c.progress)}%`, background: c.color }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
