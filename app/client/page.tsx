import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import StatusChip from "@/app/components/client/StatusChip";
import { projectStatusMeta, relativeTime } from "@/app/components/client/utils";
import Icon from "@/app/components/ui/Icon";
import type { ClientPermissions, Project } from "@/app/lib/types";

interface ProjectClientRow {
  id: string;
  permissions: ClientPermissions;
  project: Project | null;
}

export default async function ClientDashboardPage() {
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

  const firstName = (session.profile.full_name || "").split(" ")[0] || session.profile.full_name || "";

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title-size" style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
          مرحباً {firstName} 👋
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
          نعمل على مشروعك بكل اهتمام — هدفنا أن تحصل على أفضل نتيجة ممكنة.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card empty-state">
          <Icon name="projects" size={40} className="nav-icon" />
          <p style={{ marginTop: 12, fontSize: 15 }}>لا توجد مشاريع مرتبطة بحسابك حالياً.</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            سيظهر مشروعك هنا فور ربطه بحسابك من قبل فريق الإنتاج.
          </p>
        </div>
      ) : (
        <div className="projects-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
          {rows.map((row) => {
            const p = row.project!;
            const status = projectStatusMeta(p.status);
            return (
              <Link
                key={row.id}
                href={`/client/projects/${p.id}`}
                className="card"
                style={{ overflow: "hidden", display: "flex", flexDirection: "column", textDecoration: "none", color: "var(--text-primary)" }}
              >
                <div style={{ height: 150, background: "var(--bg-hover)", position: "relative" }}>
                  {p.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_image_url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name="video" size={36} className="nav-icon" />
                    </div>
                  )}
                  <div style={{ position: "absolute", top: 10, insetInlineStart: 10 }}>
                    <StatusChip label={status.label} color={status.color} />
                  </div>
                </div>

                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                  <div>
                    <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 2 }}>{p.name}</h3>
                    {p.updated_at && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>آخر تحديث {relativeTime(p.updated_at)}</span>
                    )}
                  </div>

                  <div style={{ marginTop: "auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 5 }}>
                      <span>نسبة الإنجاز</span>
                      <span style={{ fontWeight: 700, color: "var(--gold)" }}>{p.progress ?? 0}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${p.progress ?? 0}%` }} />
                    </div>
                  </div>

                  <div className="btn btn-gold" style={{ justifyContent: "center", marginTop: 2 }}>
                    <span>دخول للمشروع</span>
                    <Icon name="arrowLeft" size={16} />
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
