import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import ProjectsView from "@/app/components/projects/ProjectsView";
import type { ProjectListItem } from "@/app/components/projects/ProjectCard";

export default async function ProjectsPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: projects }, { data: clients }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, type, custom_type, status, cover_image_url, progress, updated_at, client:clients(name)")
      .eq("company_id", companyId)
      .eq("archived", false)
      .order("updated_at", { ascending: false }),
    supabase.from("clients").select("id, name, email, phone").eq("company_id", companyId).order("name"),
  ]);

  const list: ProjectListItem[] = (projects ?? []).map((p) => {
    const client = p.client as { name: string } | { name: string }[] | null;
    const clientName = Array.isArray(client) ? client[0]?.name ?? null : client?.name ?? null;
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      custom_type: p.custom_type,
      status: p.status,
      cover_image_url: p.cover_image_url,
      progress: Number(p.progress ?? 0),
      updated_at: p.updated_at,
      client_name: clientName,
    };
  });

  return <ProjectsView projects={list} clients={clients ?? []} />;
}
