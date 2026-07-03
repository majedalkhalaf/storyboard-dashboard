import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { getEpisodeGallery } from "@/app/lib/episode-gallery";
import ProjectDetailView from "@/app/components/projects/ProjectDetailView";
import type { ProjectClientRow } from "@/app/components/projects/ClientsTab";
import type { ClientPermissions, Project, ProjectClientStatus, ProjectServiceItem } from "@/app/lib/types";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ episode?: string }>;
}) {
  const { id } = await params;
  const { episode: episodeParam } = await searchParams;
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data: project } = await supabase.from("projects").select("*").eq("id", id).eq("company_id", companyId).single();
  if (!project) notFound();

  let clientName: string | null = null;
  if (project.client_id) {
    const { data: client } = await supabase.from("clients").select("name").eq("id", project.client_id).single();
    clientName = client?.name ?? null;
  }

  const [{ data: services }, { data: projectClients }, gallery] = await Promise.all([
    supabase.from("project_services").select("*").eq("project_id", id).order("created_at"),
    supabase
      .from("project_clients")
      .select("id, invited_email, status, permissions, client:clients(name)")
      .eq("project_id", id)
      .order("invited_at", { ascending: false }),
    getEpisodeGallery(companyId, id),
  ]);

  const clients: ProjectClientRow[] = (projectClients ?? []).map((r) => {
    const client = r.client as { name: string } | { name: string }[] | null;
    const name = Array.isArray(client) ? client[0]?.name ?? null : client?.name ?? null;
    return {
      id: r.id,
      invited_email: r.invited_email,
      client_name: name,
      status: r.status as ProjectClientStatus,
      permissions: r.permissions as ClientPermissions,
    };
  });

  const initialEpisodeId = episodeParam && gallery.some((e) => e.id === episodeParam) ? episodeParam : (gallery[0]?.id ?? null);

  return (
    <ProjectDetailView
      project={project as Project}
      clientName={clientName}
      services={(services ?? []) as ProjectServiceItem[]}
      gallery={gallery}
      projectClients={clients}
      initialEpisodeId={initialEpisodeId}
    />
  );
}
