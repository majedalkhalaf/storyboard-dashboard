import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { getEpisodeGallery } from "@/app/lib/episode-gallery";
import ProjectDetailView from "@/app/components/projects/ProjectDetailView";
import type { ProjectClientRow } from "@/app/components/projects/ClientsTab";
import type { ClientAccessType, ClientPermissions, ClientRecord, Project, ProjectClientStatus, ProjectServiceItem } from "@/app/lib/types";

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

  // جولة واحدة بدل جولتين متتاليتين: اسم العميل لا يعتمد على أي استعلام آخر
  // في هذه الدفعة (يحتاج فقط project.client_id المعروف بالفعل)، فلا داعي
  // لانتظاره منفرداً قبل إطلاق بقية الاستعلامات.
  const [{ data: client }, { data: services }, { data: projectClients }, { data: companyClients }, gallery] = await Promise.all([
    project.client_id ? supabase.from("clients").select("name").eq("id", project.client_id).single() : Promise.resolve({ data: null as { name: string } | null }),
    supabase.from("project_services").select("*").eq("project_id", id).order("created_at"),
    supabase
      .from("project_clients")
      .select("id, invited_email, status, permissions, invited_at, activated_at, expires_at, access_type, client_id, client:clients(id, name, phone, job_title, client_company_name)")
      .eq("project_id", id)
      .order("invited_at", { ascending: false }),
    supabase.from("clients").select("id, name, email, phone").eq("company_id", companyId).order("name"),
    getEpisodeGallery(companyId, id, session!.userId),
  ]);
  const clientName = client?.name ?? null;

  const clients: ProjectClientRow[] = (projectClients ?? []).map((r) => {
    type ClientJoin = { id: string; name: string; phone: string | null; job_title: string | null; client_company_name: string | null };
    const client = r.client as ClientJoin | ClientJoin[] | null;
    const c = Array.isArray(client) ? client[0] ?? null : client;
    return {
      id: r.id,
      client_id: r.client_id,
      invited_email: r.invited_email,
      client_name: c?.name ?? null,
      client_phone: c?.phone ?? null,
      client_job_title: c?.job_title ?? null,
      client_company_name: c?.client_company_name ?? null,
      status: r.status as ProjectClientStatus,
      permissions: r.permissions as ClientPermissions,
      invited_at: r.invited_at,
      activated_at: r.activated_at,
      expires_at: r.expires_at,
      access_type: r.access_type as ClientAccessType,
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
      companyClients={(companyClients ?? []) as Pick<ClientRecord, "id" | "name" | "email" | "phone">[]}
      initialEpisodeId={initialEpisodeId}
    />
  );
}
