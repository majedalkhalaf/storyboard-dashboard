import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPresentationData } from "@/app/lib/presentation-data-server";
import type { BookletData, BookletActivityEntry } from "@/app/lib/booklet-sections";

// يحوّل قيمة action الخام من activity_logs (+ تفاصيلها jsonb) إلى جملة عربية
// مفهومة للعميل. أي action غير مُغطّى هنا يُعاد كما هو بدل إخفائه أو تلفيقه.
function activityLabel(action: string, details: Record<string, unknown> | null): string {
  const d = details ?? {};
  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  switch (action) {
    case "episode_stage_updated":
    case "episode_stage_changed":
      return `تحديث مرحلة "${str(d.stage) || "—"}" إلى "${str(d.to) || "—"}"`;
    case "file_uploaded":
      return `رفع ملف: ${str(d.name) || "—"}`;
    case "file_deleted":
      return `حذف ملف: ${str(d.name) || "—"}`;
    case "note_added":
      return "إضافة ملاحظة جديدة";
    case "note_deleted":
      return "حذف ملاحظة";
    case "episode_created":
      return `إنشاء حلقة جديدة: ${str(d.title) || "—"}`;
    case "episode_title_changed":
      return `تعديل عنوان الحلقة من "${str(d.from) || "—"}" إلى "${str(d.to) || "—"}"`;
    case "episode_kind_changed":
      return "تعديل نوع الحلقة";
    case "project_created":
      return "إطلاق المشروع";
    case "project_status_changed":
      return `تحديث حالة المشروع إلى "${str(d.to) || "—"}"`;
    case "approval_revoked":
      return "سحب اعتماد سابق";
    case "video_link_added":
      return "إضافة رابط فيديو";
    case "episode_script_version_saved":
      return "حفظ نسخة جديدة من السكربت";
    case "video_comment_added":
      return "إضافة تعليق على الفيديو";
    case "payment_added":
      return "تسجيل دفعة جديدة";
    case "payment_updated":
      return "تحديث دفعة";
    case "expense_added":
      return "تسجيل مصروف جديد";
    default:
      return action;
  }
}

export async function fetchBookletData(
  supabase: SupabaseClient,
  companyId: string,
  projectId: string
): Promise<BookletData | null> {
  const base = await fetchPresentationData(supabase, companyId, projectId);
  if (!base) return null;

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("id, action, details, created_at, episode_id, episodes(title)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(60);

  const activityLog: BookletActivityEntry[] = (logs ?? []).map((row) => {
    const episode = row.episodes as { title: string } | { title: string }[] | null;
    const episodeTitle = Array.isArray(episode) ? (episode[0]?.title ?? null) : (episode?.title ?? null);
    return {
      id: row.id,
      label: activityLabel(row.action, row.details as Record<string, unknown> | null),
      episodeTitle,
      createdAt: row.created_at,
    };
  });

  const totalEpisodes = base.episodes.length;
  const completedEpisodes = base.episodes.filter((e) => e.status === "completed").length;
  const totalFiles = Object.values(base.fileCounts).reduce((sum, n) => sum + n, 0);
  const totalDurationSeconds = base.episodes.reduce((sum, e) => sum + (e.duration_seconds ?? 0), 0);

  const projectStartDate = base.projectCreatedAt;
  const projectDeliveredDate = base.deliveryDate;
  const daysElapsed = projectStartDate
    ? Math.max(0, Math.round((Date.parse(projectDeliveredDate ?? new Date().toISOString()) - Date.parse(projectStartDate)) / 86400000))
    : null;

  return {
    ...base,
    totalEpisodes,
    completedEpisodes,
    totalFiles,
    totalDurationSeconds,
    projectStartDate,
    projectDeliveredDate,
    daysElapsed,
    activityLog,
  };
}
