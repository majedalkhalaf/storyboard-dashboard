import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    const user = data.user;
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      const pendingCompanyName = user.user_metadata?.pending_company_name as string | undefined;

      if (!profile?.company_id && pendingCompanyName) {
        await supabase.rpc("create_company_and_owner", {
          p_company_name: pendingCompanyName,
          p_email: user.email,
          p_phone: user.user_metadata?.pending_phone ?? null,
        });
      }
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
