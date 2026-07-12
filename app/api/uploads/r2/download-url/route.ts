import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { createR2Client, r2BucketName } from "@/app/lib/r2-client";

// تحميل قسري (Content-Disposition: attachment) بالاسم الأصلي للملف — لفريق العمل
// الداخلي. يسحب الملف من R2 على خادمنا ويبثّه (stream) مباشرة كاستجابة من نفس
// الأصل بدل إعادة رابط خارجي للمتصفح — يزيل الاعتماد على CORS/سلوك تبويب خارجي
// عند تنزيل فيديو كبير (نفس إصلاح app/api/client-portal/files/[fileId]/route.ts).
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

    const client = createR2Client();
    const obj = await client.send(new GetObjectCommand({ Bucket: r2BucketName(), Key: body.key }));
    if (!obj.Body) return NextResponse.json({ error: "تعذّر تنزيل الملف" }, { status: 500 });

    // اسم عربي/يونيكود داخل Content-Disposition يحتاج الصيغة القياسية filename*=UTF-8''
    // (RFC 6266) مع اسم احتياطي ASCII فقط، وإلا يظهر اسم الملف المحمَّل بصيغته
    // المرمَّزة حرفياً بدل اسمه الحقيقي في متصفحات لا تفكّ ترميز filename="%.." تلقائياً.
    const asciiFallback = body.fileName.replace(/[^\x20-\x7E]/g, "_");
    const headers = new Headers();
    headers.set("Content-Disposition", `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(body.fileName)}`);
    headers.set("Content-Type", obj.ContentType || "application/octet-stream");
    if (obj.ContentLength != null) headers.set("Content-Length", String(obj.ContentLength));

    return new NextResponse(await obj.Body.transformToWebStream(), { headers });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر تنزيل الملف" }, { status: 500 });
  }
}
