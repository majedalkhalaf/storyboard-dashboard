import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { ensureCompanyForPendingUser } from "@/app/lib/ensure-company";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.user) {
      await ensureCompanyForPendingUser(supabase, data.user.id);
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
