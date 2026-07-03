import { createClient } from "@/app/lib/supabase/server";
import type { EpisodeStatus } from "@/app/lib/types";

// بطاقة المعرض تحتاج بيانات مختصرة فقط لكل حلقة (وليس السكربت/الملاحظات الكاملة)
// حتى يبقى تحميل الصفحة الأول خفيفاً — التفاصيل الكاملة تُجلب عند اختيار حلقة فقط
// (انظر app/lib/episode-detail.ts).

export interface StageBadge {
  label: string;
  color: string;
}

export interface EpisodeGalleryItem {
  id: string;
  number: number | null;
  title: string;
  type: string | null;
  status: EpisodeStatus;
  progress: number;
  cover_image_url: string | null;
  duration_seconds: number | null;
  assigned_to_name: string | null;
  updated_at: string;
  stageBadge: StageBadge;
  filesCount: number;
  notesCount: number;
  commentsCount: number;
  versionsCount: number;
  hasActiveApproval: boolean;
}

// مجموعة الحلقة الحالية (planning/shooting/editing/review/delivery) — نفس تجميع
// StageProgress في app/lib/workspace-projects.ts لضمان اتساق الألوان والتسميات.
const STAGE_BUCKET: Record<string, "planning" | "shooting" | "editing" | "review"> = {
  idea: "planning",
  script: "planning",
  scenario: "planning",
  storyboard: "planning",
  shooting: "shooting",
  audio: "shooting",
  editing: "editing",
  color: "editing",
  review: "review",
};

// ملاحظة: "المراجعة" هنا سماوي مائل للرمادي (Slate) بدل البنفسجي — هوية النظام
// لا تستخدم البنفسجي إطلاقاً رغم أن بعض المراجع التصميمية اقترحته لهذه الحالة تحديداً.
const BUCKET_BADGE: Record<string, StageBadge> = {
  planning: { label: "تخطيط", color: "#CE902F" },
  shooting: { label: "تصوير", color: "#3B82F6" },
  editing: { label: "مونتاج", color: "#F59E0B" },
  review: { label: "مراجعة", color: "#64748B" },
};

function computeStageBadge(status: EpisodeStatus, stages: { key: string; status: string; sort_order: number }[]): StageBadge {
  if (status === "ready_for_approval") return { label: "بانتظار العميل", color: "#06B6D4" };
  if (status === "approved") return { label: "معتمدة", color: "#1DB954" };
  if (status === "delivered") return { label: "مسلمة", color: "#0F7A3D" };

  const active = [...stages]
    .filter((s) => s.status !== "pending" && s.status !== "skipped")
    .sort((a, b) => b.sort_order - a.sort_order)[0];
  if (active) {
    const bucket = STAGE_BUCKET[active.key];
    if (bucket && BUCKET_BADGE[bucket]) return BUCKET_BADGE[bucket];
  }
  return { label: "لم يبدأ", color: "#6B7280" };
}

export async function getEpisodeGallery(companyId: string, projectId: string): Promise<EpisodeGalleryItem[]> {
  const supabase = await createClient();

  const [
    { data: episodes },
    { data: stages },
    { data: files },
    { data: notes },
    { data: approvals },
    { data: scriptVersions },
  ] = await Promise.all([
    supabase
      .from("episodes")
      .select("*, assignee:profiles!assigned_to(full_name)")
      .eq("project_id", projectId)
      .order("sort_order"),
    supabase.from("episode_stages").select("episode_id, key, status, sort_order").eq("company_id", companyId),
    supabase.from("files").select("episode_id").eq("project_id", projectId).not("episode_id", "is", null),
    supabase.from("notes").select("episode_id, video_timestamp_seconds").eq("project_id", projectId).not("episode_id", "is", null),
    supabase.from("approvals").select("episode_id, revoked_at").eq("project_id", projectId),
    supabase.from("episode_script_versions").select("episode_id").eq("company_id", companyId),
  ]);

  const stagesByEpisode: Record<string, { key: string; status: string; sort_order: number }[]> = {};
  for (const s of stages ?? []) {
    (stagesByEpisode[s.episode_id] ??= []).push({ key: s.key, status: s.status, sort_order: s.sort_order });
  }

  const filesCountByEpisode: Record<string, number> = {};
  for (const f of files ?? []) {
    if (!f.episode_id) continue;
    filesCountByEpisode[f.episode_id] = (filesCountByEpisode[f.episode_id] ?? 0) + 1;
  }

  const notesCountByEpisode: Record<string, number> = {};
  const commentsCountByEpisode: Record<string, number> = {};
  for (const n of notes ?? []) {
    if (!n.episode_id) continue;
    if (n.video_timestamp_seconds !== null) {
      commentsCountByEpisode[n.episode_id] = (commentsCountByEpisode[n.episode_id] ?? 0) + 1;
    } else {
      notesCountByEpisode[n.episode_id] = (notesCountByEpisode[n.episode_id] ?? 0) + 1;
    }
  }

  const activeApprovalEpisodes = new Set((approvals ?? []).filter((a) => !a.revoked_at).map((a) => a.episode_id));

  const versionsCountByEpisode: Record<string, number> = {};
  for (const v of scriptVersions ?? []) {
    versionsCountByEpisode[v.episode_id] = (versionsCountByEpisode[v.episode_id] ?? 0) + 1;
  }

  return (episodes ?? []).map((e) => {
    const assignee = Array.isArray(e.assignee) ? e.assignee[0] : e.assignee;
    return {
      id: e.id,
      number: e.number,
      title: e.title,
      type: e.type,
      status: e.status,
      progress: Number(e.progress ?? 0),
      cover_image_url: e.cover_image_url,
      duration_seconds: e.duration_seconds,
      assigned_to_name: assignee?.full_name ?? null,
      updated_at: e.updated_at,
      stageBadge: computeStageBadge(e.status, stagesByEpisode[e.id] ?? []),
      filesCount: filesCountByEpisode[e.id] ?? 0,
      notesCount: notesCountByEpisode[e.id] ?? 0,
      commentsCount: commentsCountByEpisode[e.id] ?? 0,
      versionsCount: versionsCountByEpisode[e.id] ?? 0,
      hasActiveApproval: activeApprovalEpisodes.has(e.id),
    };
  });
}
