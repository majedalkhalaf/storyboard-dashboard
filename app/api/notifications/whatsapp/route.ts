import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { isInternalRole } from "@/app/lib/permissions";
import { getActiveWhatsappConfig, sendWhatsappMessage } from "@/app/lib/server/whatsapp";
import { toWhatsappDigits } from "@/app/lib/server/invitation-tracking";

// إرسال تلقائي حقيقي لرسالة واتساب عامة (مثل إشعار "تم رفع الفيديو") لأي عضو فريق
// داخلي — لا يقتصر على المدراء كما هو الحال في اختبار إعدادات واتساب بزنس، لأن أي
// عضو فريق يرفع فيديو يجب أن يستطيع إشعار العميل. company_id يُؤخذ من ملف تعريف
// المستخدم المصادَق عليه وليس من الطلب، لمنع انتحال إرسال باسم شركة أخرى. بلا إعداد
// واتساب بزنس فعّال، يُعاد success:false مع سبب واضح بدل ادّعاء إرسال لم يحدث —
// الواجهة تعرض حينها رابط wa.me اليدوي بدلاً من ذلك.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
    if (!profile?.company_id || !isInternalRole(profile.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { phone, message } = body as { phone?: string; message?: string };
    if (!phone?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "رقم الجوال والرسالة مطلوبان" }, { status: 400 });
    }

    const config = await getActiveWhatsappConfig(profile.company_id);
    if (!config) {
      return NextResponse.json({ sent: false, error: "لا يوجد إعداد واتساب بزنس فعّال لهذه الشركة — استخدم رابط واتساب اليدوي بدلاً من ذلك" });
    }

    const result = await sendWhatsappMessage(config, toWhatsappDigits(phone.trim()), message);
    if (!result.success) {
      return NextResponse.json({ sent: false, error: result.error || "فشل إرسال الرسالة" });
    }
    return NextResponse.json({ sent: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "فشل إرسال الرسالة" }, { status: 500 });
  }
}
