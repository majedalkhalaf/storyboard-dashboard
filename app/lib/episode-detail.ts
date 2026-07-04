import { createClient } from "@/app/lib/supabase/client";
import type { ApprovalRow } from "@/app/components/episodes/ApprovalPanel";
import type { ActivityItem } from "@/app/components/projects/ActivityTimeline";
import type { Episode, EpisodeScriptVersion, EpisodeStage, Note, ProjectFile } from "@/app/lib/types";

// يُجلب عند اختيار حلقة من المعرض فقط (lazy) — بطاقة المعرض (episode-gallery.ts)
// تكفي لعرض القائمة، وهذا الكائن الكامل يغذّي تبويبات مساحة عمل الحلقة الثمانية.

export interface NoteWithAuthor extends Note {
  author_name: string | null;
  author_job_title: string | null;
}

export interface ScriptVersionWithAuthor extends EpisodeScriptVersion {
  author_name: string | null;
}

export interface TeamMemberOption {
  id: string;
  full_name: string | null;
}

export interface EpisodeFullDetail extends Episode {
  assigned_to_name: string | null;
  stages: EpisodeStage[];
  approvals: ApprovalRow[];
  scriptVersions: ScriptVersionWithAuthor[];
  notes: NoteWithAuthor[];
  comments: NoteWithAuthor[];
  files: ProjectFile[];
  activity: ActivityItem[];
  teamMembers: TeamMemberOption[];
}

export async function fetchEpisodeDetail(episodeId: string, companyId: string): Promise<EpisodeFullDetail> {
  const supabase = createClient();

  const { data: episode, error } = await supabase
    .from("episodes")
    .select("*, assignee:profiles!assigned_to(full_name)")
    .eq("id", episodeId)
    .single();
  if (error || !episode) throw error ?? new Error("الحلقة غير موجودة");

  const [
    { data: stages },
    { data: approvalRows },
    { data: scriptVersionRows },
    { data: noteRows },
    { data: fileRows },
    { data: activityRows },
    { data: teamRows },
  ] = await Promise.all([
    supabase.from("episode_stages").select("*").eq("episode_id", episodeId).order("sort_order"),
    supabase
      .from("approvals")
      .select("id, note, approved_at, revoked_at, client:profiles!client_id(full_name)")
      .eq("episode_id", episodeId)
      .order("approved_at", { ascending: false }),
    supabase
      .from("episode_script_versions")
      .select("*, author:profiles!created_by(full_name)")
      .eq("episode_id", episodeId)
      .order("created_at", { ascending: false }),
    supabase
      .from("notes")
      .select("*, author:profiles!author_id(full_name, job_title)")
      .eq("episode_id", episodeId)
      .order("created_at", { ascending: false }),
    supabase.from("files").select("*").eq("episode_id", episodeId).order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("*, actor:profiles!actor_id(full_name, job_title)")
      .eq("episode_id", episodeId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("id, full_name").eq("company_id", companyId).neq("role", "client").order("full_name"),
  ]);

  const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

  const approvals: ApprovalRow[] = (approvalRows ?? []).map((a) => ({
    id: a.id,
    approver_name: one<{ full_name: string | null }>(a.client as never)?.full_name ?? null,
    note: a.note,
    approved_at: a.approved_at,
    revoked_at: a.revoked_at,
  }));

  const scriptVersions: ScriptVersionWithAuthor[] = (scriptVersionRows ?? []).map((v) => ({
    id: v.id,
    company_id: v.company_id,
    episode_id: v.episode_id,
    field: v.field,
    content: v.content,
    created_by: v.created_by,
    created_at: v.created_at,
    author_name: one<{ full_name: string | null }>(v.author as never)?.full_name ?? null,
  }));

  const allNotes: NoteWithAuthor[] = (noteRows ?? []).map((n) => ({
    ...(n as Note),
    author_name: one<{ full_name: string | null; job_title: string | null }>(n.author as never)?.full_name ?? null,
    author_job_title: one<{ full_name: string | null; job_title: string | null }>(n.author as never)?.job_title ?? null,
  }));
  const notes = allNotes.filter((n) => n.video_timestamp_seconds === null);
  const comments = allNotes.filter((n) => n.video_timestamp_seconds !== null);

  const activity: ActivityItem[] = (activityRows ?? []).map((a) => ({
    id: a.id,
    actor_role: a.actor_role,
    actor_name: one<{ full_name: string | null; job_title: string | null }>(a.actor as never)?.full_name ?? null,
    actor_job_title: one<{ full_name: string | null; job_title: string | null }>(a.actor as never)?.job_title ?? null,
    action: a.action,
    details: (a.details ?? {}) as Record<string, unknown>,
    created_at: a.created_at,
  }));

  return {
    ...(episode as Episode),
    assigned_to_name: one<{ full_name: string | null }>(episode.assignee as never)?.full_name ?? null,
    stages: (stages ?? []) as EpisodeStage[],
    approvals,
    scriptVersions,
    notes,
    comments,
    files: (fileRows ?? []) as ProjectFile[],
    activity,
    teamMembers: (teamRows ?? []) as TeamMemberOption[],
  };
}
