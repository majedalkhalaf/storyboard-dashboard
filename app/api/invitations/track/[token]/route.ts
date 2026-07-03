import { NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { extractRequestIp, parseUserAgent } from "@/app/lib/server/invitation-tracking";

// رابط التتبّع الفعلي المُضمَّن في رسائل الدعوة (بريد/واتساب/SMS) بدل كشف رابط
// Supabase السحري مباشرة. أول زيارة حقيقية تُسجَّل هنا (IP، User-Agent، الجهاز
// والمتصفح المُستخرجان منه)، ثم إعادة توجيه فورية للوجهة الحقيقية المخزَّنة.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: invitation } = await admin.from("invitations").select("*").eq("token", token).maybeSingle();

  if (!invitation) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (invitation.expires_at && new Date(invitation.expires_at) < new Date() && invitation.status !== "accepted") {
    if (invitation.status !== "expired") {
      await admin.from("invitations").update({ status: "expired" }).eq("id", invitation.id);
    }
    return NextResponse.redirect(new URL("/login?invite=expired", request.url));
  }

  if (invitation.status === "sent" || invitation.status === "pending") {
    const ip = extractRequestIp(request);
    const userAgent = request.headers.get("user-agent");
    const { device, browser } = parseUserAgent(userAgent);
    await admin
      .from("invitations")
      .update({
        status: "opened",
        opened_at: new Date().toISOString(),
        ip_address: ip,
        user_agent: userAgent,
        device,
        browser,
      })
      .eq("id", invitation.id);
  }

  return NextResponse.redirect(invitation.destination_url);
}
