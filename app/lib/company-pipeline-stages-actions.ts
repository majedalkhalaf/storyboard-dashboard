import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyPipelineStage } from "@/app/lib/types";

// توليد key فريد وآمن من عنوان عربي/إنجليزي حر — لا حاجة لتطابق دقيق لأن key يُستخدم
// داخلياً فقط (StageQuickSelect وepisodes.pipeline_stage)، والعرض دائماً عبر label.
function slugifyStageKey(label: string): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_+|_+$/g, "") || "stage";
  return `${base}_${Date.now().toString(36)}`;
}

export async function addCompanyPipelineStage(
  supabase: SupabaseClient,
  companyId: string,
  existingStages: CompanyPipelineStage[],
  label: string
): Promise<CompanyPipelineStage> {
  const nextSortOrder = existingStages.length ? Math.max(...existingStages.map((s) => s.sort_order)) + 1 : 0;
  const { data, error } = await supabase
    .from("company_pipeline_stages")
    .insert({ company_id: companyId, key: slugifyStageKey(label), label, color: "#6B7280", notify_client: false, sort_order: nextSortOrder })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("تعذّر إضافة المرحلة");
  return data as CompanyPipelineStage;
}

export async function updateCompanyPipelineStage(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<CompanyPipelineStage, "label" | "color" | "notify_client" | "sort_order">>
) {
  await supabase.from("company_pipeline_stages").update(patch).eq("id", id);
}

// حذف مرحلة قيد الاستخدام حالياً في حلقة ما آمن تماماً: StageQuickSelect يعرض
// المفتاح الخام إن لم يجد مرحلة مطابقة في القائمة، فلا يتعطل شيء عند الحذف.
export async function deleteCompanyPipelineStage(supabase: SupabaseClient, id: string) {
  await supabase.from("company_pipeline_stages").delete().eq("id", id);
}

export async function swapCompanyPipelineStageOrder(supabase: SupabaseClient, a: CompanyPipelineStage, b: CompanyPipelineStage) {
  await Promise.all([
    supabase.from("company_pipeline_stages").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("company_pipeline_stages").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);
}
