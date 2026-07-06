import { NextResponse } from "next/server";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { createR2Client, r2BucketName } from "@/app/lib/r2-client";

// يُصدر رابطاً موقّتاً موقّعاً (presigned) لرفع جزء واحد من الملف مباشرة من
// المتصفح إلى R2 — بايتات الملف نفسها لا تمر عبر خادمنا إطلاقاً، فلا حد حجم
// مفروض من طبقة Netlify Functions.
export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || !session.company) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = (await request.json()) as { key?: string; uploadId?: string; partNumber?: number };
    if (!body.key || !body.uploadId || !body.partNumber) {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }
    // تحقّق أن المفتاح يخص شركة المستخدم فعلاً — المسار يبدأ دائماً بمعرّف الشركة
    // (buildFilePath)، فيمنع أي محاولة تلاعب بمفتاح لا يخصّه.
    if (!body.key.startsWith(`${session.company.id}/`)) {
      return NextResponse.json({ error: "غير مصرح بهذا المسار" }, { status: 403 });
    }

    const client = createR2Client();
    const command = new UploadPartCommand({
      Bucket: r2BucketName(),
      Key: body.key,
      UploadId: body.uploadId,
      PartNumber: body.partNumber,
    });
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });

    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر إصدار رابط الرفع" }, { status: 500 });
  }
}
