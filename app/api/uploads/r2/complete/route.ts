import { NextResponse } from "next/server";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { createR2Client, r2BucketName } from "@/app/lib/r2-client";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || !session.company) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = (await request.json()) as { key?: string; uploadId?: string; parts?: { PartNumber: number; ETag: string }[] };
    if (!body.key || !body.uploadId || !body.parts || body.parts.length === 0) {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }
    if (!body.key.startsWith(`${session.company.id}/`)) {
      return NextResponse.json({ error: "غير مصرح بهذا المسار" }, { status: 403 });
    }

    const client = createR2Client();
    await client.send(
      new CompleteMultipartUploadCommand({
        Bucket: r2BucketName(),
        Key: body.key,
        UploadId: body.uploadId,
        MultipartUpload: { Parts: body.parts },
      })
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر إنهاء الرفع" }, { status: 500 });
  }
}
