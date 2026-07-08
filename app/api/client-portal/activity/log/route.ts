import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { requireClientPortalUser } from "@/app/lib/client-portal-auth";
import { parseUserAgent, firstForwardedIp } from "@/app/lib/user-agent";
import type { ClientActivityEventType } from "@/app/lib/types";

const TEAM_ROLES = ["super_admin", "company_owner", "admin", "team_member"];
const MAX_EVENTS_PER_REQUEST = 25;

interface EventInput {
  event_type: ClientActivityEventType;
  session_id?: string | null;
  page?: string | null;
  action?: string | null;
  duration_seconds?: number | null;
  metadata?: Record<string, unknown>;
  project_id?: string | null;
  episode_id?: string | null;
}

// نقطة استقبال دُفعية لأحداث التصفّح (page_view/file_download/video_watch...) —
// المتصفح يُجمِّع الأحداث محلياً ويرسلها كل بضع ثوانٍ دفعة واحدة بدل طلب
// منفصل لكل حدث، تقليلاً للحمل على الخادم (Batch Events حسب طلب الأداء).
export async function POST(request: Request) {
  try {
    const auth = await requireClientPortalUser();
    if (!auth) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const body = (await request.json().catch(() => null)) as { events?: EventInput[] } | null;
    const events = (body?.events ?? []).slice(0, MAX_EVENTS_PER_REQUEST);
    if (events.length === 0) return NextResponse.json({ ok: true });

    const { device, browser } = parseUserAgent(request.headers.get("user-agent"));
    const ip = firstForwardedIp(request.headers.get("x-forwarded-for"));

    const rows = events.map((e) => ({
      company_id: auth.companyId,
      client_user_id: auth.userId,
      session_id: e.session_id ?? null,
      project_id: e.project_id ?? null,
      episode_id: e.episode_id ?? null,
      event_type: e.event_type,
      page: e.page ?? null,
      action: e.action ?? null,
      duration_seconds: e.duration_seconds ?? null,
      metadata: e.metadata ?? {},
      device,
      browser,
      ip,
    }));

    const admin = createAdminClient();
    await admin.from("client_activity_logs").insert(rows);

    const downloadEvent = events.find((e) => e.event_type === "file_download");
    if (downloadEvent) {
      const { data: profile } = await admin.from("profiles").select("full_name").eq("id", auth.userId).single();
      const { data: teamMembers } = await admin.from("profiles").select("id").eq("company_id", auth.companyId).in("role", TEAM_ROLES);
      if (teamMembers && teamMembers.length > 0) {
        const fileName = (downloadEvent.metadata?.fileName as string | undefined) ?? "ملف";
        await admin.from("notifications").insert(
          teamMembers.map((m) => ({
            user_id: m.id,
            company_id: auth.companyId,
            project_id: downloadEvent.project_id ?? null,
            episode_id: downloadEvent.episode_id ?? null,
            type: "client_file_download",
            title: "تحميل ملف",
            message: `حمّل ${profile?.full_name ?? "العميل"} ملف "${fileName}"`,
          }))
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "تعذّر تسجيل النشاط" }, { status: 500 });
  }
}
