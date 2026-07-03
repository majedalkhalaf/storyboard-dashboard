import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { isInternalAdmin } from "@/app/lib/permissions";
import { getEmailSenderById, sendMailViaSender } from "@/app/lib/server/mailer";

// يرسل بريداً تجريبياً حقيقياً (ليس محاكاة) إلى بريد المدير الحالي نفسه، باستخدام
// إعدادات SMTP المخزَّنة فعلياً — يعيد رسالة الخطأ الحقيقية من خادم SMTP عند الفشل
// (بيانات اعتماد خاطئة، منفذ محجوب، إلخ) بدل نجاح وهمي.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("company_id, role, email").eq("id", user.id).single();
    if (!profile?.company_id || !isInternalAdmin(profile.role)) {
      return NextResponse.json({ error: "غير مصرح — للمدراء فقط" }, { status: 403 });
    }
    if (!profile.email) {
      return NextResponse.json({ error: "لا يوجد بريد إلكتروني مرتبط بحسابك لإرسال الاختبار إليه" }, { status: 400 });
    }

    const sender = await getEmailSenderById(profile.company_id, id);
    if (!sender) return NextResponse.json({ error: "بريد الإرسال غير موجود" }, { status: 404 });

    await sendMailViaSender(sender, {
      to: profile.email,
      subject: "رسالة اختبار — إعدادات بريد الدعوات",
      html: `<div style="font-family:sans-serif;direction:rtl;text-align:right">
        <p>هذه رسالة اختبار للتأكد من عمل إعدادات SMTP الخاصة بـ<b>${sender.from_name}</b> بشكل صحيح.</p>
        <p>إن وصلتك هذه الرسالة فإعدادات الإرسال سليمة ويمكن اعتمادها لإرسال دعوات العملاء.</p>
      </div>`,
      text: `هذه رسالة اختبار للتأكد من عمل إعدادات SMTP الخاصة بـ ${sender.from_name}.`,
    });

    return NextResponse.json({ success: true, sentTo: profile.email });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "فشل إرسال البريد التجريبي" }, { status: 500 });
  }
}
