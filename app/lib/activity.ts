import type { SupabaseClient } from "@supabase/supabase-js";

interface LogActivityArgs {
  companyId: string;
  projectId?: string | null;
  episodeId?: string | null;
  action: string;
  details?: Record<string, unknown>;
}

// غلاف خفيف حول RPC log_activity — يُستدعى من مكونات "use client" بعد أي عملية مهمة
// (إنشاء مشروع، تغيير مرحلة، تغيير حالة حلقة...) لتغذية تبويب "النشاط".
export async function logActivity(
  supabase: SupabaseClient,
  { companyId, projectId = null, episodeId = null, action, details = {} }: LogActivityArgs
) {
  await supabase.rpc("log_activity", {
    p_company_id: companyId,
    p_project_id: projectId,
    p_episode_id: episodeId,
    p_action: action,
    p_details: details,
  });
}
