import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import FilesView from "@/app/components/files/FilesView";
import type { FileListItem } from "@/app/components/files/FilesView";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: filesRaw }, { data: projects }, { data: episodes }] = await Promise.all([
    supabase
      .from("files")
      .select("*, project:projects(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("id, name").eq("company_id", companyId).eq("archived", false).order("name"),
    supabase.from("episodes").select("id, project_id, title").eq("company_id", companyId).order("title"),
  ]);

  const episodeTitleById = new Map((episodes ?? []).map((e) => [e.id, e.title]));

  const list: FileListItem[] = (filesRaw ?? []).map((f) => {
    const project = f.project as { name: string } | { name: string }[] | null;
    const projectName = Array.isArray(project) ? project[0]?.name ?? "—" : project?.name ?? "—";
    return {
      id: f.id,
      project_id: f.project_id,
      episode_id: f.episode_id,
      name: f.name,
      storage_path: f.storage_path,
      external_url: f.external_url,
      file_type: f.file_type,
      category: f.category,
      size_bytes: f.size_bytes,
      client_visible: f.client_visible,
      created_at: f.created_at,
      project_name: projectName,
      episode_title: f.episode_id ? episodeTitleById.get(f.episode_id) ?? null : null,
    };
  });

  return (
    <FilesView
      files={list}
      projects={projects ?? []}
      episodes={(episodes ?? []).map((e) => ({ id: e.id, project_id: e.project_id, title: e.title }))}
    />
  );
}
