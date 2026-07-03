import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { isInternalAdmin } from "@/app/lib/permissions";
import { sendWhatsappMessage, type WhatsappConfig } from "@/app/lib/server/whatsapp";
import { toWhatsappDigits } from "@/app/lib/server/invitation-tracking";

// يرسل رسالة واتساب تجريبية حقيقية (ليست محاكاة) عبر Meta WhatsApp Cloud API إلى
// رقم يُرسله المستخدم صراحة في الطلب — لا يمكن اختبار واتساب بلا رقم مستلم حقيقي
// مسجَّل لديه (بخلاف البريد، لا يوجد "بريد اختباري" مضمون الوصول). يعيد رسالة
// الخطأ الحقيقية من Graph API عند الفشل بدل نجاح وهمي.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
    if (!profile?.company_id || !isInternalAdmin(profile.role)) {
      return NextResponse.json({ error: "غير مصرح — للمدراء فقط" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { testPhoneNumber } = body as { testPhoneNumber?: string };
    if (!testPhoneNumber || !testPhoneNumber.trim()) {
      return NextResponse.json({ error: "رقم الجوال المستقبِل للاختبار مطلوب" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: config } = await admin
      .from("company_whatsapp_config")
      .select("id, phone_number_id, access_token, business_phone_display")
      .eq("id", id)
      .eq("company_id", profile.company_id)
      .maybeSingle();

    if (!config) return NextResponse.json({ error: "إعداد واتساب بزنس غير موجود" }, { status: 404 });

    const to = toWhatsappDigits(testPhoneNumber.trim());
    const result = await sendWhatsappMessage(
      config as WhatsappConfig,
      to,
      "هذه رسالة اختبار للتأكد من عمل إعدادات واتساب بزنس API بشكل صحيح. إن وصلتك هذه الرسالة فإعدادات الإرسال سليمة ويمكن اعتمادها لإرسال دعوات العملاء."
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || "فشل إرسال رسالة الاختبار" }, { status: 502 });
    }

    return NextResponse.json({ success: true, sentTo: to });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "فشل إرسال رسالة الاختبار" }, { status: 500 });
  }
}
