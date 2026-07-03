import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { getEnvHealthReport } from "@/app/lib/server/env-health";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["company_owner", "admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    return NextResponse.json({ items: getEnvHealthReport() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "خطأ غير متوقع" }, { status: 500 });
  }
}
