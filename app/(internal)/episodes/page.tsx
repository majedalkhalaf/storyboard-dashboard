import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import EpisodesView from "@/app/components/episodes/EpisodesView";
import type { EpisodeListItem } from "@/app/components/episodes/EpisodeListCard";

export const dynamic = "force-dynamic";

export default async function EpisodesPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: episodesRaw }, { data: projects }] = await Promise.all([
    supabase
      .from("episodes")
      .select("*, project:projects(id, name, client:clients(name))")
      .eq("company_id", companyId)
      .order("updated_at", { ascending: false }),
    supabase.from("projects").select("id, name").eq("company_id", companyId).eq("archived", false).order("name"),
  ]);

  type JoinedProject = { id: string; name: string; client: { name: string } | { name: string }[] | null };

  const list: EpisodeListItem[] = (episodesRaw ?? []).map((e) => {
    const project = e.project as JoinedProject | JoinedProject[] | null;
    const proj = Array.isArray(project) ? project[0] : project;
    const client = proj?.client;
    const clientName = Array.isArray(client) ? client[0]?.name ?? null : client?.name ?? null;
    return {
      id: e.id,
      project_id: e.project_id,
      number: e.number,
      title: e.title,
      cover_image_url: e.cover_image_url,
      status: e.status,
      progress: Number(e.progress ?? 0),
      updated_at: e.updated_at,
      project_name: proj?.name ?? "—",
      client_name: clientName,
    };
  });

  return <EpisodesView episodes={list} projects={projects ?? []} />;
}
