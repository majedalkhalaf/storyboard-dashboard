import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import Icon from "@/app/components/ui/Icon";
import { PROJECT_STATUSES } from "@/app/lib/constants";

export default async function DashboardPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: projects }, { data: invoices }, { count: clientsCount }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, status, progress, cover_image_url, updated_at")
      .eq("company_id", companyId)
      .eq("archived", false)
      .order("updated_at", { ascending: false })
      .limit(6),
    supabase.from("invoices").select("amount, status").eq("company_id", companyId),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("company_id", companyId),
  ]);

  const { count: activeCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "in_progress");

  const { count: completedCount } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("status", ["completed", "delivered"]);

  const { count: totalProjects } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);

  const totalRevenue = (invoices ?? []).filter((i) => i.status === "paid").reduce((sum, i) => sum + Number(i.amount), 0);
  const unpaidRevenue = (invoices ?? [])
    .filter((i) => i.status === "unpaid" || i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const stats = [
    { label: "إجمالي المشاريع", value: totalProjects ?? 0, icon: "projects" as const },
    { label: "قيد التنفيذ", value: activeCount ?? 0, icon: "clock" as const },
    { label: "مكتملة", value: completedCount ?? 0, icon: "checkCircle" as const },
    { label: "العملاء", value: clientsCount ?? 0, icon: "clients" as const },
    { label: "إيرادات محصّلة", value: `${totalRevenue.toLocaleString()} ر.س`, icon: "money" as const },
    { label: "مستحقات غير محصّلة", value: `${unpaidRevenue.toLocaleString()} ر.س`, icon: "alert" as const },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
          مرحباً {session?.profile.full_name || ""} 👋
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>نظرة عامة على أداء شركتك</p>
      </div>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <Icon name={s.icon} size={20} className="text-muted" />
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 10 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>أحدث المشاريع</h2>
          <Link href="/projects" style={{ fontSize: 13, color: "var(--gold)" }}>
            عرض الكل
          </Link>
        </div>

        {!projects || projects.length === 0 ? (
          <div className="empty-state card">
            <p>لا توجد مشاريع بعد</p>
            <Link href="/projects" className="btn btn-gold" style={{ marginTop: 14 }}>
              <Icon name="plus" size={16} /> إنشاء أول مشروع
            </Link>
          </div>
        ) : (
          <div className="projects-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {projects.map((p) => {
              const statusInfo = PROJECT_STATUSES.find((s) => s.value === p.status);
              return (
                <Link href={`/projects/${p.id}`} key={p.id} className="card" style={{ padding: 16, display: "block" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <span className="chip" style={{ color: statusInfo?.color, borderColor: statusInfo?.color }}>
                      {statusInfo?.label}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{p.name}</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>{p.progress}% مكتمل</div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
