import { NextResponse } from "next/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { r2PublicUrl } from "@/app/lib/r2-client";

// يُعيد رابط الملف الفعلي مباشرة من R2 (بعد التحقق أن المفتاح يتبع نطاق شركة
// المستخدم) بدل سحب الملف على خادمنا وإعادة بثّه — بثّ فيديو كبير عبر خادمنا
// كان يعرّض التنزيل لخطر توقّف الدالة السحابية (Netlify) منتصف النقل إن تجاوز
// وقت النقل مهلة تنفيذها، فينتج ملفاً مبتوراً. اسم الملف عند الحفظ يُحدَّد من
// جهة المتصفح (a.download) في downloadWithProgress، فلا حاجة لـ Content-Disposition هنا.
export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || !session.company) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = (await request.json()) as { key?: string; fileName?: string };
    if (!body.key || !body.fileName) {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }
    if (!body.key.startsWith(`${session.company.id}/`)) {
      return NextResponse.json({ error: "غير مصرح بهذا المسار" }, { status: 403 });
    }

    return NextResponse.json({ url: r2PublicUrl(body.key) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر تنزيل الملف" }, { status: 500 });
  }
}
