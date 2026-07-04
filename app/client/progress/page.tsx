import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireClient } from "@/app/components/client/guards";
import { canClient } from "@/app/lib/permissions";
import ProgressUpdateCard, { type ClientProgressUpdate } from "@/app/components/client/ProgressUpdateCard";
import Icon from "@/app/components/ui/Icon";
import type { ClientPermissions, Project, ProgressUpdate } from "@/app/lib/types";

interface ProjectClientRow {
  permissions: ClientPermissions;
  project: Project | null;
}

// صفحة "العمل الجاري" المجمّعة — كل تحديثات التنفيذ المشتركة عبر كل مشاريع
// العميل النشطة معاً، بترتيب زمني، بدل الاضطرار لفتح كل مشروع على حدة.
export default async function ClientProgressPage() {
  const session = await requireClient();
  const supabase = await createClient();

  const { data } = await supabase
    .from("project_clients")
    .select("permissions, project:projects(*)")
    .eq("client_user_id", session.userId)
    .eq("status", "active");

  const rows = ((data ?? []) as unknown as ProjectClientRow[]).filter((r) => r.project && !r.project.archived && canClient(r.permissions, "progress_view"));
  const projectIds = rows.map((r) => r.project!.id);
  const projectNameById = new Map(rows.map((r) => [r.project!.id, r.project!.name]));

  const { data: progressRows } = projectIds.length
    ? await supabase
        .from("progress_updates")
        .select("*, episode:episodes(title)")
        .in("project_id", projectIds)
        .eq("shared_with_client", true)
        .order("created_at", { ascending: false })
    : { data: [] as ProgressUpdate[] };

  const progressRowsTyped = (progressRows ?? []) as unknown as (ProgressUpdate & { episode: { title: string } | { title: string }[] | null })[];
  const authorIds = Array.from(new Set(progressRowsTyped.map((u) => u.author_id)));
  const authorNameById = new Map<string, string>();
  if (authorIds.length > 0) {
    const admin = createAdminClient();
    const { data: authors } = await admin.from("profiles").select("id, full_name").in("id", authorIds);
    for (const a of authors ?? []) {
      if (a.full_name) authorNameById.set(a.id, a.full_name);
    }
  }

  const updates: ClientProgressUpdate[] = progressRowsTyped.map((u) => {
    const ep = Array.isArray(u.episode) ? (u.episode[0] ?? null) : u.episode;
    return {
      id: u.id,
      projectId: u.project_id,
      projectName: projectNameById.get(u.project_id) ?? "",
      episodeTitle: ep?.title ?? null,
      authorName: authorNameById.get(u.author_id) ?? null,
      title: u.title,
      description: u.description,
      stage: u.stage,
      contentType: u.content_type,
      media: u.media,
      createdAt: u.created_at,
    };
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>
        العمل الجاري
      </h1>

      {updates.length === 0 ? (
        <div className="card empty-state">
          <Icon name="barChart" size={36} className="nav-icon" />
          <p style={{ marginTop: 12, fontSize: 14 }}>لا توجد تحديثات عمل جارٍ متاحة حالياً.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {updates.map((u) => (
            <ProgressUpdateCard key={u.id} update={u} showProjectHashtag />
          ))}
        </div>
      )}
    </div>
  );
}
