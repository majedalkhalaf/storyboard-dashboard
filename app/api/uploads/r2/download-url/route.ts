import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { createR2Client, r2BucketName } from "@/app/lib/r2-client";

// رابط تحميل قسري (Content-Disposition: attachment) بالاسم الأصلي للملف —
// الرابط العام المباشر (r2.dev) لا يوفّر هذا الخيار، فيُستخدم فقط للتشغيل
// المباشر، بينما هذا المسار مخصص لزر "تحميل" تحديداً. لفريق العمل الداخلي.
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

    // اسم عربي/يونيكود داخل Content-Disposition يحتاج الصيغة القياسية filename*=UTF-8''
    // (RFC 6266) مع اسم احتياطي ASCII فقط، وإلا يظهر اسم الملف المحمَّل بصيغته
    // المرمَّزة حرفياً بدل اسمه الحقيقي في متصفحات لا تفكّ ترميز filename="%.." تلقائياً.
    const asciiFallback = body.fileName.replace(/[^\x20-\x7E]/g, "_");
    const client = createR2Client();
    const command = new GetObjectCommand({
      Bucket: r2BucketName(),
      Key: body.key,
      ResponseContentDisposition: `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(body.fileName)}`,
    });
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر إنشاء رابط التحميل" }, { status: 500 });
  }
}
