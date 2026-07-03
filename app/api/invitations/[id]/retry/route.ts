import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getDefaultEmailSender, sendMailViaSender } from "@/app/lib/server/mailer";

// إعادة إرسال يدوية (يضغطها المسؤول بنفسه من سجل الدعوات) لدعوة بريد إلكتروني
// فشلت — وليست إعادة محاولة تلقائية بخلفية Queue (لا بنية طابور حقيقية هنا). حسابات
// واتساب/SMS لا تُسجَّل "فاشلة" أصلاً في هذا النظام (تتراجع لرابط/رسالة يدوية بدل
// الفشل)، لذا هذا المسار مخصّص لطريقة البريد الإلكتروني فقط.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
    if (!profile?.company_id || !["company_owner", "admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: invitation } = await admin.from("invitations").select("*").eq("id", id).eq("company_id", profile.company_id).maybeSingle();
    if (!invitation) return NextResponse.json({ error: "الدعوة غير موجودة" }, { status: 404 });
    if (invitation.status !== "failed") {
      return NextResponse.json({ error: "لا يمكن إعادة إرسال دعوة ليست في حالة فشل" }, { status: 400 });
    }
    if (invitation.delivery_method !== "email") {
      return NextResponse.json({ error: "إعادة الإرسال متاحة حالياً لدعوات البريد الإلكتروني فقط" }, { status: 400 });
    }

    const [{ data: project }, { data: client }] = await Promise.all([
      supabase.from("projects").select("name").eq("id", invitation.project_id).single(),
      invitation.client_id ? supabase.from("clients").select("name").eq("id", invitation.client_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    const clientName = client?.name ?? invitation.email;
    const origin = new URL(request.url).origin;

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: invitation.email,
      options: { redirectTo: `${origin}/auth/callback` },
    });
    if (linkError || !linkData.properties?.action_link) {
      await admin.from("invitations").update({ retry_count: invitation.retry_count + 1, error_message: linkError?.message ?? "تعذّر توليد رابط جديد" }).eq("id", id);
      return NextResponse.json({ error: linkError?.message || "تعذّر توليد رابط دخول جديد" }, { status: 500 });
    }

    const trackingUrl = `${origin}/api/invitations/track/${invitation.token}`;
    await admin.from("invitations").update({ destination_url: linkData.properties?.action_link }).eq("id", id);

    const sender = await getDefaultEmailSender(profile.company_id);

    try {
      if (sender) {
        await sendMailViaSender(sender, {
          to: invitation.email,
          subject: "تمت دعوتك لمتابعة مشروعك",
          html: `<div style="font-family:sans-serif;direction:rtl;text-align:right">
            <p>مرحباً ${clientName}،</p>
            <p>تمت دعوتك لمتابعة مشروع "${project?.name ?? "مشروعك"}" عبر نظام إدارة الإنتاج. اضغط الرابط أدناه لإكمال الدخول:</p>
            <p><a href="${trackingUrl}">${trackingUrl}</a></p>
          </div>`,
          text: `مرحباً ${clientName}، رابط الدخول: ${trackingUrl}`,
        });
      } else {
        const { error: fallbackErr } = await admin.auth.admin.inviteUserByEmail(invitation.email, { redirectTo: `${origin}/auth/callback` });
        if (fallbackErr) throw new Error(fallbackErr.message);
      }
    } catch (mailErr) {
      const message = mailErr instanceof Error ? mailErr.message : "خطأ غير معروف";
      await admin.from("invitations").update({ retry_count: invitation.retry_count + 1, error_message: message }).eq("id", id);
      return NextResponse.json({ error: `فشلت إعادة الإرسال: ${message}` }, { status: 500 });
    }

    await admin
      .from("invitations")
      .update({ status: "sent", sent_at: new Date().toISOString(), retry_count: invitation.retry_count + 1, error_message: null })
      .eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "خطأ غير متوقع أثناء إعادة الإرسال" }, { status: 500 });
  }
}
