import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import { canClient } from "@/app/lib/permissions";
import ReportProjectCard from "@/app/components/client/ReportProjectCard";
import Icon from "@/app/components/ui/Icon";
import type { ClientPermissions, Project } from "@/app/lib/types";

interface ProjectClientRow {
  permissions: ClientPermissions;
  project: Project | null;
}

// صفحة "التقارير" — تحميل تقرير كامل (ZIP) أو سريع (نصي) لأي من مشاريع
// العميل النشطة، كل مشروع بصلاحياته الخاصة (download_project/finance/payments).
export default async function ClientReportsPage() {
  const session = await requireClient();
  const supabase = await createClient();

  const { data } = await supabase
    .from("project_clients")
    .select("permissions, project:projects(*)")
    .eq("client_user_id", session.userId)
    .eq("status", "active");

  const rows = ((data ?? []) as unknown as ProjectClientRow[])
    .filter((r) => r.project && !r.project.archived)
    .sort((a, b) => (b.project!.updated_at || "").localeCompare(a.project!.updated_at || ""));

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
        التقارير
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: 13.5, marginBottom: 20 }}>
        حمّل تقريراً كاملاً بكل ملفات المشروع، أو تقريراً سريعاً بالأرقام الرئيسية، لأي من مشاريعك.
      </p>

      {rows.length === 0 ? (
        <div className="card empty-state">
          <Icon name="barChart" size={36} className="nav-icon" />
          <p style={{ marginTop: 12, fontSize: 14 }}>لا توجد مشاريع مرتبطة بحسابك حالياً.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {rows.map((r) => (
            <ReportProjectCard
              key={r.project!.id}
              project={r.project!}
              canDownloadZip={canClient(r.permissions, "download_project")}
              canFinance={canClient(r.permissions, "finance")}
              canPayments={canClient(r.permissions, "payments")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
