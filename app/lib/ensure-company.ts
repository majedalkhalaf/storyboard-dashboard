import type { createClient } from "@/app/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// يُستدعى كلما وجدنا مستخدماً داخلياً بلا company_id (بعد signUp مباشرة، أو بعد
// تأكيد البريد عبر أي من المسارين) — يُكمل إنشاء الشركة من بيانات pending_*
// المخزّنة في user_metadata عند التسجيل، بدل توجيه المستخدم لصفحة تسجيل جديدة
// لا يمكنه إكمالها فعلياً (لأن بريده مسجّل بالفعل).
export async function ensureCompanyForPendingUser(
  supabase: SupabaseServerClient,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", userId).single();
  if (profile?.company_id) return true;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pendingCompanyName = user?.user_metadata?.pending_company_name as string | undefined;
  if (!pendingCompanyName) return false;

  const { error } = await supabase.rpc("create_company_and_owner", {
    p_company_name: pendingCompanyName,
    p_email: user?.email ?? null,
    p_phone: user?.user_metadata?.pending_phone ?? null,
  });

  return !error;
}
