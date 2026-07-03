import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { ensureCompanyForPendingUser } from "@/app/lib/ensure-company";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.user) {
      await ensureCompanyForPendingUser(supabase, data.user.id);
      await markLatestInvitationAccepted(data.user.id);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}

// أول تفعيل ناجح لرابط دعوة (بريد/رابط منسوخ) هو "قبول" فعلي حقيقي — يُسجَّل هنا
// وليس تخميناً، لأنه يعتمد على نجاح exchangeCodeForSession فعلاً. يستخدم
// service_role لأن جلسة العميل نفسه لا تملك صلاحية RLS لتعديل جدول invitations.
async function markLatestInvitationAccepted(clientUserId: string) {
  try {
    const admin = createAdminClient();
    const { data: latest } = await admin
      .from("invitations")
      .select("id")
      .eq("client_user_id", clientUserId)
      .in("status", ["sent", "opened"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) {
      await admin.from("invitations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", latest.id);
    }
  } catch {
    // فشل تسجيل القبول لا يجب أن يمنع تسجيل دخول العميل فعلياً — تدقيق وليس بوابة أمان
  }
}
