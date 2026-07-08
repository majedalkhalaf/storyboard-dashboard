import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireClientPortalUser } from "@/app/lib/client-portal-auth";
import { parseUserAgent, firstForwardedIp } from "@/app/lib/user-agent";

const TEAM_ROLES = ["super_admin", "company_owner", "admin", "team_member"];

// يُستدعى مرة واحدة عند فتح بوابة العميل (أول تحميل للتبويب) — ينشئ جلسة
// جديدة في client_sessions، ويُشعر فريق العمل فقط إن كان هذا أول دخول
// لهذا العميل اليوم (تجنّباً لإغراق الجرس بإشعار عند كل تبويب/تحديث).
export async function POST(request: Request) {
  try {
    const auth = await requireClientPortalUser();
    if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const ua = request.headers.get("user-agent");
    const { device, browser } = parseUserAgent(ua);
    const ip = firstForwardedIp(request.headers.get("x-forwarded-for"));

    const admin = createAdminClient();

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count: sessionsToday } = await admin
      .from("client_sessions")
      .select("id", { count: "exact", head: true })
      .eq("client_user_id", auth.userId)
      .gte("started_at", startOfDay.toISOString());
    const isFirstLoginToday = !sessionsToday || sessionsToday === 0;

    const { data: session, error } = await admin
      .from("client_sessions")
      .insert({
        company_id: auth.companyId,
        client_user_id: auth.userId,
        device,
        browser,
        ip,
        user_agent: ua,
      })
      .select("id")
      .single();
    if (error || !session) return NextResponse.json({ error: "تعذّر بدء الجلسة" }, { status: 500 });

    await admin.from("client_activity_logs").insert({
      company_id: auth.companyId,
      client_user_id: auth.userId,
      session_id: session.id,
      event_type: "login",
      device,
      browser,
      ip,
    });

    if (isFirstLoginToday) {
      const { data: profile } = await admin.from("profiles").select("full_name").eq("id", auth.userId).single();
      const { data: teamMembers } = await admin.from("profiles").select("id").eq("company_id", auth.companyId).in("role", TEAM_ROLES);
      if (teamMembers && teamMembers.length > 0) {
        await admin.from("notifications").insert(
          teamMembers.map((m) => ({
            user_id: m.id,
            company_id: auth.companyId,
            type: "client_login",
            title: "دخول عميل",
            message: `دخل ${profile?.full_name ?? "عميل"} إلى بوابة العميل`,
          }))
        );
      }
    }

    return NextResponse.json({ sessionId: session.id });
  } catch {
    return NextResponse.json({ error: "تعذّر بدء الجلسة" }, { status: 500 });
  }
}
