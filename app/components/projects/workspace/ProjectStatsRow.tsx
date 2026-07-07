import Icon, { type IconName } from "@/app/components/ui/Icon";
import type { WorkspaceProject } from "@/app/lib/workspace-projects";

export default function ProjectStatsRow({ projects }: { projects: WorkspaceProject[] }) {
  const totalProjects = projects.length;
  const totalEpisodes = projects.reduce((s, p) => s + p.episodeCount, 0);
  const clientIds = new Set(projects.map((p) => p.client_id).filter(Boolean));
  const active = projects.filter((p) => p.status === "in_progress").length;
  const pendingApproval = projects.filter((p) => p.episodesPendingClient > 0).length;
  const overdue = projects.filter((p) => p.isOverdue).length;
  const totalRevenue = projects.reduce((s, p) => s + p.revenue, 0);
  const avgProgress = totalProjects > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / totalProjects) : 0;

  const stats: { label: string; value: string | number; icon: IconName; color: string }[] = [
    { label: "إجمالي المشاريع", value: totalProjects, icon: "projects", color: "var(--gold)" },
    { label: "إجمالي الحلقات", value: totalEpisodes, icon: "episodes", color: "#06B6D4" },
    { label: "العملاء", value: clientIds.size, icon: "clients", color: "#8B5CF6" },
    { label: "المشاريع النشطة", value: active, icon: "checkCircle", color: "var(--success)" },
    { label: "بانتظار اعتماد العميل", value: pendingApproval, icon: "clock", color: "var(--warning)" },
    { label: "المشاريع المتأخرة", value: overdue, icon: "warning", color: "var(--danger)" },
    { label: "إجمالي الإيرادات", value: `${totalRevenue.toLocaleString("en-US")} ر.س`, icon: "money", color: "var(--success)" },
    { label: "متوسط الإنجاز", value: `${avgProgress}%`, icon: "barChart", color: "var(--gold)" },
  ];

  return (
    <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
      {stats.map((s) => (
        <div key={s.label} className="stat-card">
          <span style={{ color: s.color, display: "inline-flex", background: `${s.color}1a`, padding: 8, borderRadius: 10 }}>
            <Icon name={s.icon} size={18} />
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10 }}>{s.value}</div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
