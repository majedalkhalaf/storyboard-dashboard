import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import EpisodeDetailView from "@/app/components/episodes/EpisodeDetailView";
import type { ApprovalRow } from "@/app/components/episodes/ApprovalPanel";
import type { ActivityItem } from "@/app/components/projects/ActivityTimeline";

export const dynamic = "force-dynamic";

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string; episodeId: string }>;
}) {
  const { id, episodeId } = await params;
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data: episode } = await supabase
    .from("episodes")
    .select("*")
    .eq("company_id", companyId)
    .eq("project_id", id)
    .eq("id", episodeId)
    .single();

  if (!episode) notFound();

  const [{ data: stages }, { data: approvalsRaw }, { data: activityRaw }] = await Promise.all([
    supabase.from("episode_stages").select("*").eq("episode_id", episodeId).order("sort_order"),
    supabase
      .from("approvals")
      .select("id, note, approved_at, revoked_at, client_id")
      .eq("episode_id", episodeId)
      .order("approved_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("id, action, details, created_at, actor_role, actor_id")
      .eq("episode_id", episodeId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const actorIds = Array.from(
    new Set([...(approvalsRaw ?? []).map((a) => a.client_id).filter(Boolean), ...(activityRaw ?? []).map((a) => a.actor_id).filter(Boolean)])
  ) as string[];

  let namesById: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: people } = await supabase.from("profiles").select("id, full_name").in("id", actorIds);
    namesById = Object.fromEntries((people ?? []).map((p) => [p.id, p.full_name ?? ""]));
  }

  const approvals: ApprovalRow[] = (approvalsRaw ?? []).map((a) => ({
    id: a.id,
    approver_name: a.client_id ? namesById[a.client_id] ?? null : null,
    note: a.note,
    approved_at: a.approved_at,
    revoked_at: a.revoked_at,
  }));

  const activities: ActivityItem[] = (activityRaw ?? []).map((a) => ({
    id: a.id,
    actor_role: a.actor_role,
    actor_name: a.actor_id ? namesById[a.actor_id] ?? null : null,
    action: a.action,
    details: (a.details ?? {}) as Record<string, unknown>,
    created_at: a.created_at,
  }));

  return (
    <EpisodeDetailView
      projectId={id}
      episode={episode}
      stages={stages ?? []}
      approvals={approvals}
      activities={activities}
    />
  );
}
