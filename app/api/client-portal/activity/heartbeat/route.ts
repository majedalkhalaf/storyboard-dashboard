import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireClientPortalUser } from "@/app/lib/client-portal-auth";

// نبضة خفيفة كل دقيقة تقريباً بينما التبويب مرئي — تُحدّث last_seen_at
// فقط، وهي مصدر حالة الاتصال المباشرة (🟢 متصل الآن) لدى فريق العمل.
export async function POST(request: Request) {
  try {
    const auth = await requireClientPortalUser();
    if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
    if (!body?.sessionId) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

    const admin = createAdminClient();
    await admin
      .from("client_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", body.sessionId)
      .eq("client_user_id", auth.userId)
      .is("ended_at", null);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "تعذّر تحديث النبضة" }, { status: 500 });
  }
}
