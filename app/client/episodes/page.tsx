import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import { canClient } from "@/app/lib/permissions";
import EpisodeGridCard from "@/app/components/client/EpisodeGridCard";
import Icon from "@/app/components/ui/Icon";
import type { ClientPermissions, Episode, Project } from "@/app/lib/types";

interface ProjectClientRow {
  permissions: ClientPermissions;
  project: Project | null;
}

// صفحة "الحلقات والإنتاج" — كل حلقات كل المشاريع النشطة المسموح للعميل برؤية
// حلقاتها، بنفس تصميم بطاقة الحلقة المستخدمة داخل صفحة المشروع (صورة كاملة،
// نسبة إنجاز، عدد الملفات/الملاحظات، وزر الاعتماد النهائي للحلقة).
export default async function ClientEpisodesPage() {
  const session = await requireClient();
  const supabase = await createClient();

  const { data } = await supabase
    .from("project_clients")
    .select("permissions, project:projects(*)")
    .eq("client_user_id", session.userId)
    .eq("status", "active");

  const rows = ((data ?? []) as unknown as ProjectClientRow[])
    .filter((r) => r.project && !r.project.archived && canClient(r.permissions, "episodes"))
    .sort((a, b) => (b.project!.updated_at || "").localeCompare(a.project!.updated_at || ""));

  const companyIds = [...new Set(rows.map((r) => r.project!.company_id))];
  const { data: companyRows } = companyIds.length
    ? await supabase.from("companies").select("id, logo_url").in("id", companyIds)
    : { data: [] as { id: string; logo_url: string | null }[] };
  const companyLogoById = new Map((companyRows ?? []).map((c) => [c.id, c.logo_url]));

  const perProject = await Promise.all(
    rows.map(async (r) => {
      const project = r.project!;
      const [{ data: episodeRows }, { data: approvals }, { data: fileRows }, { data: noteRows }] = await Promise.all([
        supabase.from("episodes").select("*").eq("project_id", project.id).order("sort_order", { ascending: true }),
        supabase.from("approvals").select("episode_id").eq("project_id", project.id).is("revoked_at", null),
        canClient(r.permissions, "files")
          ? supabase.from("files").select("episode_id").eq("project_id", project.id).eq("client_visible", true).not("episode_id", "is", null)
          : Promise.resolve({ data: [] as { episode_id: string }[] }),
        supabase.from("notes").select("episode_id").eq("project_id", project.id).not("episode_id", "is", null),
      ]);

      const episodeFileCounts: Record<string, number> = {};
      for (const row of (fileRows ?? []) as { episode_id: string }[]) episodeFileCounts[row.episode_id] = (episodeFileCounts[row.episode_id] ?? 0) + 1;
      const episodeNoteCounts: Record<string, number> = {};
      for (const row of (noteRows ?? []) as { episode_id: string }[]) episodeNoteCounts[row.episode_id] = (episodeNoteCounts[row.episode_id] ?? 0) + 1;
      const approvedIds = new Set((approvals ?? []).map((a) => a.episode_id as string));

      return {
        project,
        permissions: r.permissions,
        episodes: (episodeRows ?? []) as Episode[],
        episodeFileCounts,
        episodeNoteCounts,
        approvedIds,
      };
    })
  );

  const totalEpisodes = perProject.reduce((s, p) => s + p.episodes.length, 0);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>
        الحلقات والإنتاج
      </h1>

      {totalEpisodes === 0 ? (
        <div className="card empty-state">
          <Icon name="episodes" size={36} className="nav-icon" />
          <p style={{ marginTop: 12, fontSize: 14 }}>لا توجد حلقات متاحة حالياً.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {perProject
            .filter((p) => p.episodes.length > 0)
            .map((p) => (
              <div key={p.project.id}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                  {p.project.name} <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>({p.episodes.length})</span>
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                  {p.episodes.map((ep) => (
                    <EpisodeGridCard
                      key={ep.id}
                      episode={ep}
                      projectId={p.project.id}
                      companyId={p.project.company_id}
                      userId={session.userId}
                      permissions={p.permissions}
                      isApproved={p.approvedIds.has(ep.id) || ep.status === "approved" || ep.status === "delivered"}
                      fileCount={p.episodeFileCounts[ep.id] ?? 0}
                      noteCount={p.episodeNoteCounts[ep.id] ?? 0}
                      companyLogoUrl={companyLogoById.get(p.project.company_id)}
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
