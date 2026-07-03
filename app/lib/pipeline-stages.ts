import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompanyPipelineStage } from "@/app/lib/types";

export async function getCompanyPipelineStages(supabase: SupabaseClient, companyId: string): Promise<CompanyPipelineStage[]> {
  const { data } = await supabase
    .from("company_pipeline_stages")
    .select("*")
    .eq("company_id", companyId)
    .order("sort_order");
  return (data as CompanyPipelineStage[]) ?? [];
}
