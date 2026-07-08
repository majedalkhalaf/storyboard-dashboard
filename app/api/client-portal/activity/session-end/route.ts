import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireClientPortalUser } from "@/app/lib/client-portal-auth";

// يُستدعى عبر navigator.sendBeacon عند مغادرة/إغلاق بوابة العميل — يُنهي
// الجلسة (ended_at + duration_seconds) ويسجّل حدث "logout" في الـ Timeline.
export async function POST(request: Request) {
  try {
    const auth = await requireClientPortalUser();
    if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
    if (!body?.sessionId) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

    const admin = createAdminClient();
    const { data: session } = await admin
      .from("client_sessions")
      .select("id, started_at, ended_at")
      .eq("id", body.sessionId)
      .eq("client_user_id", auth.userId)
      .maybeSingle();
    if (!session || session.ended_at) return NextResponse.json({ ok: true });

    const endedAt = new Date();
    const durationSeconds = Math.max(0, Math.round((endedAt.getTime() - new Date(session.started_at).getTime()) / 1000));

    await admin
      .from("client_sessions")
      .update({ ended_at: endedAt.toISOString(), last_seen_at: endedAt.toISOString(), duration_seconds: durationSeconds })
      .eq("id", session.id);

    await admin.from("client_activity_logs").insert({
      company_id: auth.companyId,
      client_user_id: auth.userId,
      session_id: session.id,
      event_type: "logout",
      duration_seconds: durationSeconds,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "تعذّر إنهاء الجلسة" }, { status: 500 });
  }
}
