import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { generateInvitationToken, generateTempPassword } from "@/app/lib/server/invitation-tracking";
import { buildInviteMessage } from "@/app/lib/server/invite-message";
import { dispatchInviteMessage } from "@/app/lib/server/invite-dispatch";
import type { InvitationStatus } from "@/app/lib/types";

// إعادة إرسال دعوة عميل موجود أصلاً في مشروع (من تبويب "العملاء" داخل إعدادات
// المشروع) — على عكس /api/invitations/send لا يُنشئ صف project_clients جديداً،
// فقط يُعيد بناء رسالة الدعوة ويحاول إرسالها من جديد. كلمة المرور المؤقتة
// الأصلية لا يمكن استرجاعها أبداً (Supabase يخزّنها مُجزَّأة hashed فقط) — لذا
// "الاطلاع عليها" يعني عملياً توليد واحدة جديدة تُبطل القديمة، سواء لعميل لم
// يُفعّل حسابه بعد أو بطلب صريح (regeneratePassword) لعميل نسي كلمة مروره.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!profile?.company_id || !["company_owner", "admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await request.json();
    const { projectClientId, regeneratePassword } = body as { projectClientId?: string; regeneratePassword?: boolean };
    if (!projectClientId) return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });

    const admin = createAdminClient();
    const { data: pc } = await admin
      .from("project_clients")
      .select("id, project_id, client_id, client_user_id, invited_email")
      .eq("id", projectClientId)
      .eq("company_id", profile.company_id)
      .maybeSingle();
    if (!pc) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

    const [{ data: project }, { data: clientRecord }, { data: companyRow }] = await Promise.all([
      admin.from("projects").select("name").eq("id", pc.project_id).single(),
      pc.client_id ? admin.from("clients").select("name, phone").eq("id", pc.client_id).maybeSingle() : Promise.resolve({ data: null }),
      admin.from("companies").select("name").eq("id", profile.company_id).maybeSingle(),
    ]);
    const clientName = clientRecord?.name ?? pc.invited_email;
    const phone = clientRecord?.phone ?? null;
    const origin = new URL(request.url).origin;

    let clientUserId = pc.client_user_id as string | null;
    let tempPassword: string | null = null;

    if (!clientUserId) {
      // صف قديم بلا حساب فعلي (من قبل إعادة بناء النظام) — يُنشأ الآن بدل الفشل
      tempPassword = generateTempPassword();
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: pc.invited_email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { role: "client", full_name: clientName },
      });
      if (createError || !created.user) {
        return NextResponse.json({ error: createError?.message || "تعذّر إنشاء حساب العميل" }, { status: 500 });
      }
      clientUserId = created.user.id;
      await admin.from("project_clients").update({ client_user_id: clientUserId }).eq("id", pc.id);
      await admin.from("profiles").update({ must_change_password: true }).eq("id", clientUserId);
    } else {
      const { data: clientProfile } = await admin.from("profiles").select("must_change_password").eq("id", clientUserId).maybeSingle();
      const neverActivated = clientProfile?.must_change_password === true;
      if (regeneratePassword || neverActivated) {
        tempPassword = generateTempPassword();
        const { error: updateError } = await admin.auth.admin.updateUserById(clientUserId, { password: tempPassword });
        if (updateError) return NextResponse.json({ error: updateError.message || "تعذّر توليد كلمة مرور جديدة" }, { status: 500 });
        await admin.from("profiles").update({ must_change_password: true }).eq("id", clientUserId);
      }
    }

    const token = generateInvitationToken();
    const trackingUrl = `${origin}/api/invitations/track/${token}`;
    const message = buildInviteMessage({
      clientName,
      projectName: project?.name ?? "مشروعك",
      loginUrl: trackingUrl,
      email: pc.invited_email,
      tempPassword,
      hasExistingAccount: !tempPassword,
      companyName: companyRow?.name ?? null,
    });

    const { emailSent, emailError, whatsappLink, whatsappSentAutomatically } = await dispatchInviteMessage({
      companyId: profile.company_id,
      toEmail: pc.invited_email,
      subject: `بيانات الدخول لمتابعة مشروعك "${project?.name ?? ""}"`,
      message,
      phone,
    });

    const status: InvitationStatus = emailSent || whatsappSentAutomatically ? "sent" : "pending";
    await admin.from("invitations").insert({
      company_id: profile.company_id,
      project_id: pc.project_id,
      client_id: pc.client_id,
      client_user_id: clientUserId,
      email: pc.invited_email,
      phone,
      delivery_method: phone ? "whatsapp" : "email",
      token,
      destination_url: `${origin}/login`,
      status,
      error_message: emailError ?? null,
      invited_by: user.id,
      sent_at: status === "sent" ? new Date().toISOString() : null,
    });

    return NextResponse.json({
      success: true,
      tempPassword,
      emailSent,
      whatsappLink,
      whatsappSentAutomatically,
      inviteMessage: message,
      email: pc.invited_email,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إعادة الإرسال" }, { status: 500 });
  }
}
