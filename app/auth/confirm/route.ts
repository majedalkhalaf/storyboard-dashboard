import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/server";

// مسار تأكيد البريد المستقل عن الجهاز/المتصفح — يعتمد على verifyOtp(token_hash)
// بدل تبادل PKCE code (الذي يفشل لو فُتح رابط التأكيد من متصفح غير الذي سجّل
// منه المستخدم، وهو شائع جداً عند فتح رابط البريد من تطبيق Gmail على الجوال).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error && data.user) {
      const user = data.user;
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      const pendingCompanyName = user.user_metadata?.pending_company_name as string | undefined;

      if (!profile?.company_id && pendingCompanyName) {
        await supabase.rpc("create_company_and_owner", {
          p_company_name: pendingCompanyName,
          p_email: user.email,
          p_phone: user.user_metadata?.pending_phone ?? null,
        });
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
