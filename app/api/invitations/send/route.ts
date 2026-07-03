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
      customMessage,
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
      customMessage?: string;
      permissions?: Partial<ClientPermissions>;
      deliveryMethod?: InvitationDeliveryMethod;
      durationDays?: number | null;
      accessType?: ClientAccessType;
      senderId?: string | null;
    };

    const email = (rawEmail ?? "").trim().toLowerCase();
    // بلا معالج خطوات يفرض اختيار قناة إرسال واحدة مسبقاً — القناة المسجَّلة في سجل
    // التدقيق هي فقط انعكاس لِما إن أُدخل رقم جوال أم لا (كلا القناتين تُتاحان معاً أدناه).
    const method: InvitationDeliveryMethod = deliveryMethod ?? (phone?.trim() ? "whatsapp" : "email");

    if (!projectId || !email || !clientName) {
      return NextResponse.json({ error: "بيانات ناقصة — المشروع والاسم والبريد الإلكتروني مطلوبة" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "البريد الإلكتروني غير صالح" }, { status: 400 });
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
    const destinationUrl = `${origin}/login`;
    let tempPassword: string | null = null;
    let accountCreated = false;

    // بغض النظر عن قناة الإرسال المختارة: أي دعوة ببريد جديد تُنشئ فوراً حساب Supabase
    // حقيقياً بكلمة مرور مؤقتة (بدل الاعتماد على رابط سحري ذي استخدام واحد) — هذا ما
    // يتيح عرض بيانات دخول جاهزة (بريد + كلمة مرور) يمكن نسخها أو إرسالها عبر أي قناة
    // (بريد/واتساب/يدوياً) بلا فرق، تماماً كما في التصميم المرجعي. بريد موجود مسبقاً
    // يُربط بالمشروع فقط دون كلمة مرور جديدة.
    if (existingProfile) {
      clientUserId = existingProfile.id;
    } else {
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
      accountCreated = true;
      await admin.from("profiles").update({ must_change_password: true }).eq("id", clientUserId);
    }

    // توكن تتبّع خاص بنا — يُستخدم في كل رسالة بدل كشف رابط Supabase السحري مباشرة،
    // ويتيح تسجيل وقت الفتح/IP/الجهاز الحقيقيين عبر /api/invitations/track/[token].
    const token = generateInvitationToken();
    const trackingUrl = `${origin}/api/invitations/track/${token}`;
    const message = buildInviteMessage({
      clientName,
      projectName: project.name ?? "مشروعك",
      loginUrl: trackingUrl,
      email,
      tempPassword,
      hasExistingAccount,
      customMessage: customMessage?.trim() || null,
    });

    // بغض النظر عن قناة الإرسال المفضّلة: تُتاح دائماً كل القنوات الممكنة في آنٍ
    // واحد بدل إجبار المستخدم على اختيار واحدة مسبقاً — بريد حقيقي إن وُجد مُرسِل
    // مُعدّ، ورابط واتساب جاهز لرقم العميل دائماً (يُفتح واتساب المسؤول نفسه
    // ببساطة عبر wa.me)، مع محاولة إرسال تلقائي حقيقي إضافية إن كان واتساب بزنس
    // API مُعدّاً وفعّالاً لهذه الشركة. لا يفشل الطلب كاملاً إن تعذّر الإرسال
    // الفعلي عبر أي قناة — الحساب أُنشئ بالفعل، والرسالة الجاهزة تبقى متاحة دوماً
    // للنسخ/الإرسال اليدوي كخط رجوع صادق.
    let emailSent = false;
    let emailError: string | null = null;
    const cleanPhone = phone?.trim() || null;
    const whatsappLink: string | null = cleanPhone ? `https://wa.me/${toWhatsappDigits(cleanPhone)}?text=${encodeURIComponent(message)}` : null;
    let whatsappSentAutomatically = false;

    const sender = senderId ? await getEmailSenderById(profile.company_id, senderId) : await getDefaultEmailSender(profile.company_id);
    if (sender) {
      try {
        await sendMailViaSender(sender, {
          to: email,
          subject: `بيانات الدخول لمتابعة مشروعك "${project.name}"`,
          html: `<div style="font-family:sans-serif;direction:rtl;text-align:right;white-space:pre-wrap">${message.replace(/\n/g, "<br/>")}</div>`,
          text: message,
        });
        emailSent = true;
      } catch (mailErr) {
        emailError = mailErr instanceof Error ? mailErr.message : "خطأ غير معروف أثناء إرسال البريد";
      }
    }

    if (cleanPhone) {
      const waConfig = await getActiveWhatsappConfig(profile.company_id);
      if (waConfig) {
        const result = await sendWhatsappMessage(waConfig, toWhatsappDigits(cleanPhone), message);
        whatsappSentAutomatically = result.success;
      }
    }

    const status: InvitationStatus = emailSent || whatsappSentAutomatically ? "sent" : "pending";
    const errorMessage = emailError;
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

    // حساب موجود مسبقاً يُربط بمشروع جديد → إشعار داخل النظام يكفي (لا كلمة مرور
    // جديدة تُشارَك). حساب جديد بكلمة مرور مؤقتة → بيانات الدخول نفسها تُعرض في
    // رسالة الدعوة الجاهزة بالواجهة، فلا حاجة لإشعار داخلي إضافي بهذه اللحظة.
    if (clientUserId && hasExistingAccount) {
      await notifyUser({
        userId: clientUserId,
        companyId: profile.company_id,
        projectId,
        type: "project_invite",
        title: "تمت إضافتك لمشروع جديد",
        message: `تمت إضافتك إلى مشروع "${project.name}". تفقّد حسابك لمتابعته.`,
      });
    }

    return NextResponse.json({
      success: true,
      projectClientId: projectClient.id,
      accountCreated,
      linkedExisting: hasExistingAccount,
      loginLink: trackingUrl,
      tempPassword,
      emailSent,
      whatsappLink,
      whatsappSentAutomatically,
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
  customMessage?: string | null;
}): string {
  const { clientName, projectName, loginUrl, email, tempPassword, hasExistingAccount, customMessage } = params;
  if (hasExistingAccount || !tempPassword) {
    return [
      `مرحباً ${clientName}،`,
      `تمت إضافتك لمتابعة مشروع "${projectName}" عبر نظام إدارة الإنتاج.`,
      ...(customMessage ? [``, customMessage] : []),
      ``,
      `رابط الدخول: ${loginUrl}`,
      `البريد الإلكتروني: ${email}`,
      ...(hasExistingAccount ? [`استخدم كلمة المرور الحالية لحسابك لديك.`] : []),
    ].join("\n");
  }
  return [
    `مرحباً ${clientName}،`,
    `تمت دعوتك لمتابعة مشروع "${projectName}" عبر نظام إدارة الإنتاج.`,
    ...(customMessage ? [``, customMessage] : []),
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
