import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import ProjectDetailView from "@/app/components/projects/ProjectDetailView";
import type { ProjectClientRow } from "@/app/components/projects/ClientsTab";
import type { ActivityItem } from "@/app/components/projects/ActivityTimeline";
import type { ClientPermissions, Episode, Project, ProjectClientStatus, ProjectServiceItem } from "@/app/lib/types";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const [
    { data: services },
    { data: episodes },
    { data: stages },
    { data: projectClients },
    { data: activityRows },
    { count: filesCount },
    { count: notesCount },
    { data: approvals },
  ] = await Promise.all([
    supabase.from("project_services").select("*").eq("project_id", id).order("created_at"),
    supabase.from("episodes").select("*").eq("project_id", id).order("sort_order"),
    supabase.from("episode_stages").select("episode_id").eq("company_id", companyId),
    supabase
      .from("project_clients")
      .select("id, invited_email, status, permissions, client:clients(name)")
      .eq("project_id", id)
      .order("invited_at", { ascending: false }),
    supabase.from("activity_logs").select("*").eq("project_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("files").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("notes").select("id", { count: "exact", head: true }).eq("project_id", id),
    supabase.from("approvals").select("id, revoked_at").eq("project_id", id),
  ]);

  const episodeIds = new Set((episodes ?? []).map((e) => e.id));
  const stageCounts: Record<string, number> = {};
  for (const s of stages ?? []) {
    if (episodeIds.has(s.episode_id)) stageCounts[s.episode_id] = (stageCounts[s.episode_id] ?? 0) + 1;
  }

  // actor names for activity
  const actorIds = Array.from(new Set((activityRows ?? []).map((a) => a.actor_id).filter(Boolean))) as string[];
  const actorNames: Record<string, string> = {};
  if (actorIds.length) {
    const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", actorIds);
    for (const p of profs ?? []) actorNames[p.id] = p.full_name ?? "";
  }

  const activities: ActivityItem[] = (activityRows ?? []).map((a) => ({
    id: a.id,
    actor_role: a.actor_role,
    actor_name: a.actor_id ? actorNames[a.actor_id] || null : null,
    action: a.action,
    details: (a.details ?? {}) as Record<string, unknown>,
    created_at: a.created_at,
  }));

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

  const pendingApprovals = (approvals ?? []).filter((a) => !a.revoked_at).length;

  return (
    <ProjectDetailView
      project={project as Project}
      clientName={clientName}
      services={(services ?? []) as ProjectServiceItem[]}
      episodes={(episodes ?? []) as Episode[]}
      stageCounts={stageCounts}
      projectClients={clients}
      activities={activities}
      counts={{ files: filesCount ?? 0, notes: notesCount ?? 0, pendingApprovals }}
    />
  );
}
