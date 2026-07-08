import { createClient } from "@/app/lib/supabase/server";

// تحقّق مشترك يستخدمه كل مسارات API الخاصة بتتبع نشاط العميل — نفس نمط
// التحقق المكرَّر في مسارات بوابة العميل الأخرى (مثل episode-edit)، مُستخرَج
// هنا فقط لأنه يتكرر حرفياً عبر أربعة مسارات جديدة في نفس الميزة.
export async function requireClientPortalUser(): Promise<{ userId: string; companyId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role, company_id").eq("id", user.id).single();
  if (profile?.role !== "client" || !profile.company_id) return null;

  return { userId: user.id, companyId: profile.company_id };
}
