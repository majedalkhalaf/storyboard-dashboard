import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { notifyUser } from "@/app/lib/server/notify";
import { getDefaultEmailSender, getEmailSenderById, sendMailViaSender } from "@/app/lib/server/mailer";
import { getActiveWhatsappConfig, sendWhatsappMessage } from "@/app/lib/server/whatsapp";
import { generateInvitationToken, generateTempPassword, toWhatsappDigits, checkInvitationRateLimit } from "@/app/lib/server/invitation-tracking";
import { DEFAULT_CLIENT_PERMISSIONS } from "@/app/lib/constants";
import type { ClientAccessType, ClientPermissions, InvitationDeliveryMethod, InvitationStatus } from "@/app/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// نقطة الدخول الوحيدة لكل دعوات العملاء — Frontend لا يرى ولا يستدعي أي مفتاح سرّي
// إطلاقاً، فقط يرسل JSON عادياً إلى هذا المسار. كل شيء بعد ذلك يحدث على الخادم:
// Frontend → (هذا المسار) → Supabase (service_role) → مزوّد البريد/واتساب.
//
// التسلسل: تحقق من الصلاحية → تحقق من صحة البيانات → تحديد المعدل → إنشاء/جلب سجل
// العميل → إلغاء أي دعوة سابقة نشطة لنفس البريد/المشروع → إنشاء/جلب حساب Supabase
// Auth (حسب طريقة الإرسال) → توليد توكن تتبّع خاص بنا (لا يُكشف رابط Supabase
// السحري مباشرة في أي رسالة) → محاولة الإرسال الفعلي → تسجيل سجل تدقيق واحد في
// invitations مهما كانت النتيجة → ربط العميل بالمشروع → إرجاع نتيجة صريحة.
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
      email: rawEmail,
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
      deliveryMethod?: InvitationDeliveryMethod;
      durationDays?: number | null;
      accessType?: ClientAccessType;
      senderId?: string | null;
    };

    const email = (rawEmail ?? "").trim().toLowerCase();
    const method: InvitationDeliveryMethod = deliveryMethod ?? "email";

    if (!projectId || !email || !clientName) {
      return NextResponse.json({ error: "بيانات ناقصة — المشروع والاسم والبريد الإلكتروني مطلوبة" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
    }
    if ((method === "whatsapp" || method === "sms") && !phone?.trim()) {
      return NextResponse.json({ error: "رقم جوال العميل مطلوب لهذه الطريقة" }, { status: 400 });
    }
    if (phone?.trim() && phone.replace(/\D/g, "").length < 8) {
      return NextResponse.json({ error: "رقم الجوال غير صالح" }, { status: 400 });
    }

    const { allowed, count } = await checkInvitationRateLimit(profile.company_id);
    if (!allowed) {
      return NextResponse.json(
        { error: `تجاوزت الحد المسموح من الدعوات (${count} خلال 10 دقائق) — حاول مرة أخرى بعد قليل` },
        { status: 429 }
      );
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id, company_id, name")
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

    // دعوة سابقة نشطة لنفس المشروع/البريد؟ تُلغى بدل ترك سجلّين "نشطين" متزامنين —
    // إعادة الدعوة عملية طبيعية شائعة وليست خطأً يجب حظره.
    await admin
      .from("invitations")
      .update({ status: "cancelled" })
      .eq("project_id", projectId)
      .eq("email", email)
      .in("status", ["pending", "sent", "opened"]);

    const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    const hasExistingAccount = Boolean(existingProfile);

    let clientUserId: string | null = null;
    let destinationUrl = `${origin}/login`;
    let tempPassword: string | null = null;

    if (existingProfile) {
      clientUserId = existingProfile.id;
    } else if (method === "whatsapp" || method === "sms") {
      tempPassword = generateTempPassword();
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { role: "client", full_name: clientName },
      });
      if (createError || !created.user) {
        return NextResponse.json({ error: createError?.message || "تعذّر إنشاء حساب العميل" }, { status: 500 });
      }
      clientUserId = created.user.id;
      await admin.from("profiles").update({ must_change_password: true }).eq("id", clientUserId);
    } else {
      // "email" و"link" كلاهما يحتاج generateLink (ينشئ الحساب دون إرسال أي بريد بذاته)
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: { data: { role: "client", full_name: clientName }, redirectTo: `${origin}/auth/callback` },
      });
      if (linkError || !linkData.user) {
        return NextResponse.json({ error: linkError?.message || "تعذّر إنشاء رابط الدعوة" }, { status: 500 });
      }
      clientUserId = linkData.user.id;
      destinationUrl = linkData.properties?.action_link ?? destinationUrl;
      await admin.from("profiles").update({ must_change_password: true }).eq("id", clientUserId);
    }

    // توكن تتبّع خاص بنا — يُستخدم في كل رسالة بدل كشف رابط Supabase السحري مباشرة،
    // ويتيح تسجيل وقت الفتح/IP/الجهاز الحقيقيين عبر /api/invitations/track/[token].
    const token = generateInvitationToken();
    const trackingUrl = `${origin}/api/invitations/track/${token}`;
    const message = buildInviteMessage({ clientName, projectName: project.name ?? "مشروعك", loginUrl: trackingUrl, email, tempPassword, hasExistingAccount });

    let status: InvitationStatus = "sent";
    let errorMessage: string | null = null;
    let usedFallbackMailer = false;
    let whatsappLink: string | null = null;
    let whatsappSentAutomatically = false;
    let smsMessage: string | null = null;
    let inviteLink: string | null = null;

    if (method === "link") {
      inviteLink = trackingUrl;
    } else if (method === "whatsapp" && phone?.trim()) {
      const waConfig = await getActiveWhatsappConfig(profile.company_id);
      if (waConfig) {
        const result = await sendWhatsappMessage(waConfig, toWhatsappDigits(phone.trim()), message);
        whatsappSentAutomatically = result.success;
        if (!result.success) {
          errorMessage = `فشل الإرسال التلقائي عبر واتساب بزنس API: ${result.error} — تم توفير رابط لفتح واتساب يدوياً بدلاً منه`;
          whatsappLink = `https://wa.me/${toWhatsappDigits(phone.trim())}?text=${encodeURIComponent(message)}`;
        }
      } else {
        whatsappLink = `https://wa.me/${toWhatsappDigits(phone.trim())}?text=${encodeURIComponent(message)}`;
      }
    } else if (method === "sms" && phone?.trim()) {
      smsMessage = message;
    } else {
      // email
      const sender = senderId ? await getEmailSenderById(profile.company_id, senderId) : await getDefaultEmailSender(profile.company_id);
      if (sender) {
        try {
          await sendMailViaSender(sender, {
            to: email,
            subject: "تمت دعوتك لمتابعة مشروعك",
            html: `<div style="font-family:sans-serif;direction:rtl;text-align:right">
              <p>مرحباً ${clientName}،</p>
              <p>تمت دعوتك لمتابعة مشروع "${project.name}" عبر نظام إدارة الإنتاج. اضغط الرابط أدناه لإكمال الدخول:</p>
              <p><a href="${trackingUrl}">${trackingUrl}</a></p>
            </div>`,
            text: message,
          });
        } catch (mailErr) {
          status = "failed";
          errorMessage = mailErr instanceof Error ? mailErr.message : "خطأ غير معروف أثناء إرسال البريد";
          await createInvitationRow(admin, { profile, projectId, clientRecord, email, phone, method, destinationUrl, clientUserId, invitedBy: user.id, token, durationDays, status, errorMessage });
          return NextResponse.json({ error: `تعذّر إرسال البريد عبر إعدادات SMTP المخصصة: ${errorMessage}` }, { status: 500 });
        }
      } else {
        usedFallbackMailer = true;
        const { error: fallbackErr } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { role: "client", full_name: clientName },
          redirectTo: `${origin}/auth/callback`,
        });
        if (fallbackErr) {
          status = "failed";
          errorMessage = fallbackErr.message;
          await createInvitationRow(admin, { profile, projectId, clientRecord, email, phone, method, destinationUrl, clientUserId, invitedBy: user.id, token, durationDays, status, errorMessage });
          return NextResponse.json({ error: fallbackErr.message || "تعذّر إرسال دعوة البريد الإلكتروني" }, { status: 500 });
        }
      }
    }

    await createInvitationRow(admin, { profile, projectId, clientRecord, email, phone, method, destinationUrl, clientUserId, invitedBy: user.id, token, durationDays, status, errorMessage: errorMessage ?? undefined });

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

    if (clientUserId && method === "email" && !usedFallbackMailer) {
      await notifyUser({
        userId: clientUserId,
        companyId: profile.company_id,
        projectId,
        type: "project_invite",
        title: "تمت دعوتك لمتابعة مشروع",
        message: `تمت إضافتك إلى مشروع جديد. تفقّد بريدك الإلكتروني لإكمال الدخول.`,
      });
    }

    return NextResponse.json({
      success: true,
      projectClientId: projectClient.id,
      inviteLink,
      usedFallbackMailer,
      whatsappLink,
      whatsappSentAutomatically,
      smsMessage,
      tempPassword,
      // نص الرسالة الجاهزة نفسه — يُعاد دائماً (وليس فقط لطريقة SMS) ليتيح للواجهة
      // عرض/نسخ رسالة واحدة موحّدة لأي طريقة تحتاج ترحيلاً يدوياً (رابط/واتساب غير
      // مُرسَل تلقائياً/SMS)، بدل الاعتماد فقط على smsMessage.
      inviteMessage: message,
    });
  } catch (err) {
    // أي خطأ غير متوقع (مثل غياب SUPABASE_SERVICE_ROLE_KEY) كان يوقف الدالة بلا
    // استجابة JSON صالحة — الآن يُرجع دائماً JSON فيه سبب الفشل الحقيقي.
    return NextResponse.json({ error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إرسال الدعوة" }, { status: 500 });
  }
}

function buildInviteMessage(params: {
  clientName: string;
  projectName: string;
  loginUrl: string;
  email: string;
  tempPassword: string | null;
  hasExistingAccount: boolean;
}): string {
  const { clientName, projectName, loginUrl, email, tempPassword, hasExistingAccount } = params;
  if (hasExistingAccount || !tempPassword) {
    return [
      `مرحباً ${clientName}،`,
      `تمت إضافتك لمتابعة مشروع "${projectName}" عبر نظام إدارة الإنتاج.`,
      ``,
      `رابط الدخول: ${loginUrl}`,
      `البريد الإلكتروني: ${email}`,
      hasExistingAccount ? `استخدم كلمة المرور الحالية لحسابك لديك.` : ``,
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    `مرحباً ${clientName}،`,
    `تمت دعوتك لمتابعة مشروع "${projectName}" عبر نظام إدارة الإنتاج.`,
    ``,
    `رابط الدخول: ${loginUrl}`,
    `البريد الإلكتروني: ${email}`,
    `كلمة المرور المؤقتة: ${tempPassword}`,
    ``,
    `سيُطلب منك تعيين كلمة مرور جديدة عند أول تسجيل دخول.`,
  ].join("\n");
}

async function createInvitationRow(
  admin: SupabaseClient,
  params: {
    profile: { company_id: string };
    projectId: string;
    clientRecord: { id: string } | null;
    email: string;
    phone?: string;
    method: InvitationDeliveryMethod;
    destinationUrl: string;
    clientUserId: string | null;
    invitedBy: string;
    token: string;
    durationDays?: number | null;
    status: InvitationStatus;
    errorMessage?: string;
  }
) {
  const expiresAt = params.durationDays ? new Date(Date.now() + params.durationDays * 86400000).toISOString() : null;
  return admin.from("invitations").insert({
    company_id: params.profile.company_id,
    project_id: params.projectId,
    client_id: params.clientRecord?.id ?? null,
    client_user_id: params.clientUserId,
    email: params.email,
    phone: params.phone ?? null,
    delivery_method: params.method,
    token: params.token,
    destination_url: params.destinationUrl,
    status: params.status,
    error_message: params.errorMessage ?? null,
    invited_by: params.invitedBy,
    sent_at: params.status === "sent" ? new Date().toISOString() : null,
    expires_at: expiresAt,
  });
}
