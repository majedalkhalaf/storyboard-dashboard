import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import { projectStatusMeta } from "@/app/components/client/utils";
import Icon from "@/app/components/ui/Icon";
import type { ClientPermissions, Project } from "@/app/lib/types";

interface ProjectClientRow {
  id: string;
  permissions: ClientPermissions;
  project: Project | null;
}

// صفحة "مشاريعي" — كل المشاريع النشطة المرتبطة بحساب العميل، وليس المشروع
// الأساسي فقط كما في الصفحة الرئيسية.
export default async function ClientProjectsPage() {
  const session = await requireClient();
  const supabase = await createClient();

  const { data } = await supabase
    .from("project_clients")
    .select("id, permissions, project:projects(*)")
    .eq("client_user_id", session.userId)
    .eq("status", "active");

  const rows = ((data ?? []) as unknown as ProjectClientRow[])
    .filter((r) => r.project && !r.project.archived)
    .sort((a, b) => (b.project!.updated_at || "").localeCompare(a.project!.updated_at || ""));

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>
        مشاريعي
      </h1>

      {rows.length === 0 ? (
        <div className="card empty-state">
          <Icon name="projects" size={36} className="nav-icon" />
          <p style={{ marginTop: 12, fontSize: 14 }}>لا توجد مشاريع مرتبطة بحسابك حالياً.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {rows.map((r) => {
            const project = r.project!;
            const status = projectStatusMeta(project.status);
            return (
              <Link
                key={project.id}
                href={`/client/projects/${project.id}`}
                className="card card-hover-lift"
                style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit" }}
              >
                <div style={{ height: 140, background: "var(--bg-hover)", position: "relative" }}>
                  {project.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={project.cover_image_url} alt={project.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="video" size={30} className="text-muted" />
                    </div>
                  )}
                  <span
                    className="chip"
                    style={{ position: "absolute", top: 10, insetInlineStart: 10, color: status.color, borderColor: status.color, background: "rgba(0,0,0,0.5)" }}
                  >
                    {status.label}
                  </span>
                </div>
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800 }}>{project.name}</h3>
                  <div style={{ marginTop: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-secondary)", marginBottom: 5 }}>
                      <span>نسبة الإنجاز</span>
                      <span style={{ fontWeight: 800, color: "var(--gold)" }}>{Math.round(project.progress ?? 0)}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.round(project.progress ?? 0)}%` }} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
