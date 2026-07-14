import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { createR2Client, r2BucketName } from "@/app/lib/r2-client";

// يُعيد رابطاً موقّتاً موقّعاً (presigned) لتنزيل الملف مباشرة من R2 (بعد التحقق
// أن المفتاح يتبع نطاق شركة المستخدم) بدل سحب الملف على خادمنا وإعادة بثّه —
// بثّ فيديو كبير عبر خادمنا كان يعرّض التنزيل لخطر توقّف الدالة السحابية
// (Netlify) منتصف النقل إن تجاوز وقت النقل مهلة تنفيذها، فينتج ملفاً مبتوراً.
// الرابط الموقّع يفرض Content-Disposition: attachment من R2 نفسه بالاسم
// الصحيح — يعمل حتى مع تنزيل مباشر بلا قراءة JS للبايتات (المسار المُفضَّل
// على الجوال لتفادي تحميل ملفات كبيرة كاملة في الذاكرة).
function contentDisposition(rawName: string): string {
  const asciiFallback = rawName.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(rawName)}`;
}

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

    const r2 = createR2Client();
    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: r2BucketName(), Key: body.key, ResponseContentDisposition: contentDisposition(body.fileName) }),
      { expiresIn: 3600 }
    );
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر تنزيل الملف" }, { status: 500 });
  }
}
