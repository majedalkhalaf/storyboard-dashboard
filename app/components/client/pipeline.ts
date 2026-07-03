import type { CompanyPipelineStage, Episode } from "@/app/lib/types";

// المرحلة الحالية للمشروع = أبكر مرحلة لم تُسلَّم/تُعتمد بعد بين حلقاته (أين
// "تعلّقت" معظم الحلقات فعلياً) — إن اكتملت كل الحلقات فآخر مرحلة في القائمة.
// منطق مشترك بين الصفحة الرئيسية لبوابة العميل وصفحة تفاصيل المشروع.
export function currentPipelineStageKey(episodes: Episode[], pipelineStages: CompanyPipelineStage[]): string | null {
  if (pipelineStages.length === 0 || episodes.length === 0) return null;
  const order = new Map(pipelineStages.map((s, i) => [s.key, i]));
  const pending = episodes.filter((e) => e.status !== "delivered" && e.status !== "approved");
  const source = pending.length > 0 ? pending : episodes;
  let minIndex = Infinity;
  let key = pipelineStages[0].key;
  for (const e of source) {
    const idx = order.get(e.pipeline_stage) ?? 0;
    if (idx < minIndex) {
      minIndex = idx;
      key = e.pipeline_stage;
    }
  }
  return key;
}
