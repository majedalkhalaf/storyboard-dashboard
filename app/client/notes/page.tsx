import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import NotesThread from "@/app/components/client/NotesThread";
import Icon from "@/app/components/ui/Icon";
import type { ClientPermissions, Note, Project } from "@/app/lib/types";

interface ProjectClientRow {
  permissions: ClientPermissions;
  project: Project | null;
}

// صفحة "طلبات التعديل" — سجل طلبات مستقل لكل مشروع نشط، مجمَّع في صفحة
// واحدة بدل الاضطرار لفتح كل مشروع على حدة.
export default async function ClientNotesPage() {
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

  const perProject = await Promise.all(
    rows.map(async (r) => {
      const project = r.project!;
      const { data: noteRows } = await supabase
        .from("notes")
        .select("*")
        .eq("project_id", project.id)
        .is("episode_id", null)
        .order("created_at", { ascending: true });
      return { project, permissions: r.permissions, notes: (noteRows ?? []) as Note[] };
    })
  );

  return (
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: "0 auto" }}>
      <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>
        طلبات التعديل
      </h1>

      {perProject.length === 0 ? (
        <div className="card empty-state">
          <Icon name="message" size={36} className="nav-icon" />
          <p style={{ marginTop: 12, fontSize: 14 }}>لا توجد مشاريع مرتبطة بحسابك حالياً.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          {perProject.map((p) => (
            <div key={p.project.id}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{p.project.name}</h3>
              <NotesThread
                companyId={p.project.company_id}
                projectId={p.project.id}
                episodeId={null}
                targetType="project"
                targetId={p.project.id}
                currentUserId={session.userId}
                currentUserName={session.profile.full_name}
                permissions={p.permissions}
                initialNotes={p.notes}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
