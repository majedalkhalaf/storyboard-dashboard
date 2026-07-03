import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinancialCategory } from "@/app/lib/types";

// نفس نمط ترتيب مراحل خط الإنتاج (company-pipeline-stages-actions.ts) لكن للتصنيفات المالية.

export async function addFinancialCategory(
  supabase: SupabaseClient,
  companyId: string,
  existingCategories: FinancialCategory[],
  data: { name: string; type: "income" | "expense"; color: string }
): Promise<FinancialCategory> {
  const sameType = existingCategories.filter((c) => c.type === data.type);
  const nextSortOrder = sameType.length ? Math.max(...sameType.map((c) => c.sort_order)) + 1 : 0;
  const { data: row, error } = await supabase
    .from("financial_categories")
    .insert({ company_id: companyId, name: data.name, type: data.type, color: data.color, sort_order: nextSortOrder })
    .select("*")
    .single();
  if (error || !row) throw error ?? new Error("تعذّر إضافة التصنيف المالي");
  return row as FinancialCategory;
}

export async function updateFinancialCategory(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<FinancialCategory, "name" | "color" | "type" | "sort_order">>
) {
  await supabase.from("financial_categories").update(patch).eq("id", id);
}

// حذف تصنيف قيد الاستخدام آمن تماماً: عمود expenses.category_id معرَّف بـ on delete set null،
// فتُصبح مصروفاته بلا تصنيف جديد بدل أن يتعطل شيء.
export async function deleteFinancialCategory(supabase: SupabaseClient, id: string) {
  await supabase.from("financial_categories").delete().eq("id", id);
}

export async function swapFinancialCategoryOrder(supabase: SupabaseClient, a: FinancialCategory, b: FinancialCategory) {
  await Promise.all([
    supabase.from("financial_categories").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("financial_categories").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);
}
