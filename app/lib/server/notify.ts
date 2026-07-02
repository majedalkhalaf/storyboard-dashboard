import { createAdminClient } from "@/app/lib/supabase/admin";

interface NotifyArgs {
  userId: string;
  companyId: string | null;
  projectId?: string | null;
  episodeId?: string | null;
  type: string;
  title?: string | null;
  message: string;
}

// يُستخدم فقط من Route Handlers / Server Actions — يتجاوز RLS عبر service_role
// لأن الإشعار غالباً يُرسل لمستخدم آخر غير المستخدم الحالي (طرف مقابل).
export async function notifyUser({ userId, companyId, projectId, episodeId, type, title, message }: NotifyArgs) {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    user_id: userId,
    company_id: companyId,
    project_id: projectId ?? null,
    episode_id: episodeId ?? null,
    type,
    title: title ?? null,
    message,
  });
}
