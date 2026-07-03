import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { notifyUser } from "@/app/lib/server/notify";
import { getDefaultEmailSender, getEmailSenderById, sendMailViaSender } from "@/app/lib/server/mailer";
import { DEFAULT_CLIENT_PERMISSIONS } from "@/app/lib/constants";
import type { ClientAccessType, ClientPermissions } from "@/app/lib/types";

// يُستدعى من نافذة "دعوة عميل" داخل مشروع (ClientInviteModal، معالج 3 خطوات). ينشئ
// حساب Supabase Auth للعميل عبر service_role إن لم يكن موجوداً، ثم يربطه بالمشروع
// في project_clients بالصلاحيات المحددة. طريقة الإرسال تحدد كيف يُنشأ الحساب:
// "email" يستخدم بريد الشركة المخصص عبر SMTP (company_email_senders) إن وُجد —
// ينشئ الحساب بلا إرسال بريد Supabase نفسه (generateLink) ثم يرسل بريداً مُصمَّماً
// بعنوان "من" الخاص بالشركة عبر nodemailer؛ إن لم يُعِدّ أي بريد مخصص بعد، يتراجع
// تلقائياً لبريد Supabase الافتراضي (inviteUserByEmail) بدل فشل العملية بالكامل.
// "link" يستخدم generateLink (ينشئ الحساب ويُعيد رابطاً جاهزاً دون إرسال أي بريد،
// لينسخه المستخدم ويُرسله يدوياً عبر أي قناة — لا يوجد تكامل واتساب/SMS حقيقي هنا).
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!profile?.company_id || !["company_owner", "admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "غير مصرح بدعوة عملاء" }, { status: 403 });
    }

    const body = await request.json();
    const {
      projectId,
      email,
      clientName,
      phone,
      jobTitle,
      clientCompanyName,
      permissions,
      deliveryMethod,
      durationDays,
      accessType,
      senderId,
    } = body as {
      projectId: string;
      email: string;
      clientName: string;
      phone?: string;
      jobTitle?: string;
      clientCompanyName?: string;
      permissions?: Partial<ClientPermissions>;
      deliveryMethod?: "email" | "link";
      durationDays?: number | null;
      accessType?: ClientAccessType;
      senderId?: string | null;
    };

    if (!projectId || !email || !clientName) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id, company_id")
      .eq("id", projectId)
      .eq("company_id", profile.company_id)
      .single();
    if (!project) return NextResponse.json({ error: "المشروع غير موجود" }, { status: 404 });

    const admin = createAdminClient();
    const origin = new URL(request.url).origin;

    const { data: clientRecord } = await admin
      .from("clients")
      .upsert(
        {
          company_id: profile.company_id,
          name: clientName,
          email,
          phone: phone ?? null,
          job_title: jobTitle ?? null,
          client_company_name: clientCompanyName ?? null,
          created_by: user.id,
        },
        { onConflict: "company_id,email", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    let clientUserId: string | null = null;
    let inviteLink: string | null = null;
    let usedFallbackMailer = false;
    const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();

    if (existingProfile) {
      clientUserId = existingProfile.id;
      // العميل يملك حساباً بالفعل ويستطيع الدخول بكلمة مروره الحالية — لا حاجة لدعوة جديدة
      inviteLink = `${origin}/login`;
    } else if (deliveryMethod === "link") {
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: { data: { role: "client", full_name: clientName }, redirectTo: `${origin}/auth/callback` },
      });
      if (linkError || !linkData.user) {
        return NextResponse.json({ error: linkError?.message || "تعذّر إنشاء رابط الدعوة" }, { status: 500 });
      }
      clientUserId = linkData.user.id;
      inviteLink = linkData.properties?.action_link ?? null;
      await admin.from("profiles").update({ must_change_password: true }).eq("id", clientUserId);
    } else {
      const sender = senderId ? await getEmailSenderById(profile.company_id, senderId) : await getDefaultEmailSender(profile.company_id);

      if (sender) {
        const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
          type: "invite",
          email,
          options: { data: { role: "client", full_name: clientName }, redirectTo: `${origin}/auth/callback` },
        });
        if (linkError || !linkData.user) {
          return NextResponse.json({ error: linkError?.message || "تعذّر إنشاء رابط الدعوة" }, { status: 500 });
        }
        clientUserId = linkData.user.id;
        const actionLink = linkData.properties?.action_link ?? `${origin}/login`;
        await admin.from("profiles").update({ must_change_password: true }).eq("id", clientUserId);

        try {
          await sendMailViaSender(sender, {
            to: email,
            subject: "تمت دعوتك لمتابعة مشروعك",
            html: `<div style="font-family:sans-serif;direction:rtl;text-align:right">
              <p>مرحباً ${clientName}،</p>
              <p>تمت دعوتك لمتابعة مشروعك عبر نظام إدارة الإنتاج. اضغط الرابط أدناه لإكمال الدخول:</p>
              <p><a href="${actionLink}">${actionLink}</a></p>
            </div>`,
            text: `مرحباً ${clientName}، تمت دعوتك لمتابعة مشروعك. رابط الدخول: ${actionLink}`,
          });
        } catch (mailErr) {
          return NextResponse.json(
            { error: `تعذّر إرسال البريد عبر إعدادات SMTP المخصصة: ${mailErr instanceof Error ? mailErr.message : "خطأ غير معروف"}` },
            { status: 500 }
          );
        }
      } else {
        // لا يوجد بريد مخصص مُعَدّ بعد لهذه الشركة — تراجع آمن لبريد Supabase الافتراضي
        usedFallbackMailer = true;
        const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { role: "client", full_name: clientName },
          redirectTo: `${origin}/auth/callback`,
        });
        if (inviteError || !invited.user) {
          return NextResponse.json({ error: inviteError?.message || "تعذّر إرسال دعوة البريد الإلكتروني" }, { status: 500 });
        }
        clientUserId = invited.user.id;
        await admin.from("profiles").update({ must_change_password: true }).eq("id", clientUserId);
      }
    }

    const expiresAt = durationDays ? new Date(Date.now() + durationDays * 86400000).toISOString() : null;

    const { data: projectClient, error: pcError } = await admin
      .from("project_clients")
      .upsert(
        {
          company_id: profile.company_id,
          project_id: projectId,
          client_id: clientRecord?.id ?? null,
          client_user_id: clientUserId,
          invited_email: email,
          status: "active",
          permissions: { ...DEFAULT_CLIENT_PERMISSIONS, ...(permissions ?? {}) },
          invited_by: user.id,
          activated_at: new Date().toISOString(),
          expires_at: expiresAt,
          access_type: accessType ?? "unlimited",
        },
        { onConflict: "project_id,client_user_id" }
      )
      .select("id")
      .single();

    if (pcError) {
      return NextResponse.json({ error: "تعذّر ربط العميل بالمشروع" }, { status: 500 });
    }

    if (clientUserId && deliveryMethod !== "link") {
      await notifyUser({
        userId: clientUserId,
        companyId: profile.company_id,
        projectId,
        type: "project_invite",
        title: "تمت دعوتك لمتابعة مشروع",
        message: `تمت إضافتك إلى مشروع جديد. تفقّد بريدك الإلكتروني لإكمال الدخول.`,
      });
    }

    return NextResponse.json({ success: true, projectClientId: projectClient.id, inviteLink, usedFallbackMailer });
  } catch (err) {
    // أي خطأ غير متوقع (مثل غياب SUPABASE_SERVICE_ROLE_KEY من متغيرات البيئة) كان
    // يوقف الدالة بلا استجابة JSON صالحة، فيظهر للمستخدم خطأ "Unexpected end of JSON
    // input" غير مفهوم بدل رسالة واضحة — الآن يُرجع دائماً JSON صالحاً فيه سبب الفشل.
    return NextResponse.json({ error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إرسال الدعوة" }, { status: 500 });
  }
}
