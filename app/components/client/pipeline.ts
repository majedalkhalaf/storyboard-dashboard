import type { CompanyPipelineStage, Episode } from "@/app/lib/types";

// المرحلة الحالية للمشروع تُشتَقّ من نسبة إنجاز الحلقات (episode.progress، محسوبة
// تلقائياً من متوسط episode_stages) بدل الاعتماد على episode.pipeline_stage — حقل
// "تغيير المرحلة السريع" اليدوي المنفصل الذي لا يُحدَّث تلقائياً مع تقدّم العمل
// الفعلي، فكان يجعل شريط المراحل يبدو "غير متزامن" (يعرض دائماً أول مرحلة/"لم يبدأ"
// إن لم يحدّثه أحد الفريق يدوياً، أو حتى إن كان مفتاحه لا يطابق قائمة مراحل الشركة
// الحالية إن أُعيد تخصيصها). الاشتقاق من النسبة رقمي دائماً ومتزامن تلقائياً.
// أبكر مرحلة لم تُسلَّم/تُعتمد بعد بين الحلقات (أين "تعلّقت" معظمها فعلياً) — إن
// اكتملت كل الحلقات فآخر مرحلة في القائمة.
export function currentPipelineStageKey(episodes: Episode[], pipelineStages: CompanyPipelineStage[]): string | null {
  if (pipelineStages.length === 0 || episodes.length === 0) return null;

  function stageIndexFor(progress: number): number {
    const idx = Math.floor((progress / 100) * pipelineStages.length);
    return Math.max(0, Math.min(pipelineStages.length - 1, idx));
  }

  const pending = episodes.filter((e) => e.status !== "delivered" && e.status !== "approved");
  const source = pending.length > 0 ? pending : episodes;

  let minIndex = pipelineStages.length - 1;
  for (const e of source) {
    minIndex = Math.min(minIndex, stageIndexFor(e.progress ?? 0));
  }
  return pipelineStages[minIndex].key;
}
