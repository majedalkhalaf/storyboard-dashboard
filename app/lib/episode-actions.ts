import type { SupabaseClient } from "@supabase/supabase-js";
import { logActivity } from "@/app/lib/activity";

/** تحديث عنوان الحلقة (تحرير Inline) + تسجيل النشاط — يُستدعى من كل مكان يعرض
 * عنوان الحلقة قابلاً للتعديل (البطاقة، رأس الصفحة، السكربت، الستوري بورد). */
export async function updateEpisodeTitle(
  supabase: SupabaseClient,
  params: { companyId: string; projectId: string; episodeId: string; oldTitle: string; newTitle: string }
) {
  const { companyId, projectId, episodeId, oldTitle, newTitle } = params;
  await supabase.from("episodes").update({ title: newTitle }).eq("id", episodeId);
  await logActivity(supabase, {
    companyId,
    projectId,
    episodeId,
    action: "episode_title_changed",
    details: { from: oldTitle, to: newTitle },
  });
}

/** تحديث حقل "تغيير المرحلة" السريع + تسجيل النشاط — الإشعار للعميل يتم تلقائياً عبر
 * trigger في قاعدة البيانات (episodes_notify_pipeline_stage) وليس من هنا. */
export async function updateEpisodePipelineStage(
  supabase: SupabaseClient,
  params: { companyId: string; projectId: string; episodeId: string; stageKey: string; stageLabel: string }
) {
  const { companyId, projectId, episodeId, stageKey, stageLabel } = params;
  await supabase.from("episodes").update({ pipeline_stage: stageKey }).eq("id", episodeId);
  await logActivity(supabase, {
    companyId,
    projectId,
    episodeId,
    action: "episode_stage_changed",
    details: { stage_key: stageKey, stage_label: stageLabel },
  });
}

/** إعادة ترتيب الحلقات (سحب وإفلات) — يحدّث sort_order لكل حلقة بحسب الترتيب الجديد */
export async function reorderEpisodes(supabase: SupabaseClient, orderedIds: string[]) {
  await Promise.all(orderedIds.map((id, index) => supabase.from("episodes").update({ sort_order: index }).eq("id", id)));
}

/** تغيير رقم حلقة يدوياً */
export async function updateEpisodeNumber(supabase: SupabaseClient, episodeId: string, number: number | null) {
  await supabase.from("episodes").update({ number }).eq("id", episodeId);
}

/** تغيير تصنيف العنصر (عادي/مقدمة/انترو/نوع مخصص) + تسجيل النشاط */
export async function updateEpisodeKind(
  supabase: SupabaseClient,
  params: { companyId: string; projectId: string; episodeId: string; kind: string; kindLabel: string | null }
) {
  const { companyId, projectId, episodeId, kind, kindLabel } = params;
  await supabase.from("episodes").update({ kind, kind_label: kind === "custom" ? kindLabel : null }).eq("id", episodeId);
  await logActivity(supabase, {
    companyId,
    projectId,
    episodeId,
    action: "episode_kind_changed",
    details: { kind, kind_label: kindLabel },
  });
}
