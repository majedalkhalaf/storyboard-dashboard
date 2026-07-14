import { createClient } from "@/app/lib/supabase/server";
import { requireClient } from "@/app/components/client/guards";
import { canClient } from "@/app/lib/permissions";
import FileList from "@/app/components/client/FileList";
import Icon from "@/app/components/ui/Icon";
import type { ClientPermissions, Project, ProjectFile } from "@/app/lib/types";

interface ProjectClientRow {
  permissions: ClientPermissions;
  project: Project | null;
}

// صفحة "الملفات والمستندات" — كل الملفات المرئية للعميل مُجمَّعة من كل
// مشاريعه النشطة، كل مشروع بصلاحية "files" الخاصة به.
export default async function ClientFilesPage() {
  const session = await requireClient();
  const supabase = await createClient();

  const { data } = await supabase
    .from("project_clients")
    .select("permissions, project:projects(*)")
    .eq("client_user_id", session.userId)
    .eq("status", "active");

  const rows = ((data ?? []) as unknown as ProjectClientRow[])
    .filter((r) => r.project && !r.project.archived && canClient(r.permissions, "files"))
    .sort((a, b) => (b.project!.updated_at || "").localeCompare(a.project!.updated_at || ""));

  const filesByProject = await Promise.all(
    rows.map(async (r) => {
      const { data: fileRows } = await supabase
        .from("files")
        .select("*")
        .eq("project_id", r.project!.id)
        .eq("client_visible", true)
        .order("created_at", { ascending: false });
      return { project: r.project!, permissions: r.permissions, files: (fileRows ?? []) as ProjectFile[] };
    })
  );

  const totalFiles = filesByProject.reduce((s, p) => s + p.files.length, 0);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200, margin: "0 auto" }}>
      <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>
        الملفات والمستندات
      </h1>

      {totalFiles === 0 ? (
        <div className="card empty-state">
          <Icon name="files" size={36} className="nav-icon" />
          <p style={{ marginTop: 12, fontSize: 14 }}>لا توجد ملفات متاحة حالياً.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {filesByProject
            .filter((p) => p.files.length > 0)
            .map((p) => (
              <div key={p.project.id}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                  {p.project.name} <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>({p.files.length})</span>
                </h3>
                <FileList files={p.files} permissions={p.permissions} zipTitle={p.project.name} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
