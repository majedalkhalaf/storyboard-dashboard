import { NextResponse } from "next/server";
import { AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { createR2Client, r2BucketName } from "@/app/lib/r2-client";

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || !session.company) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = (await request.json()) as { key?: string; uploadId?: string };
    if (!body.key || !body.uploadId) {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }
    if (!body.key.startsWith(`${session.company.id}/`)) {
      return NextResponse.json({ error: "غير مصرح بهذا المسار" }, { status: 403 });
    }

    const client = createR2Client();
    await client.send(new AbortMultipartUploadCommand({ Bucket: r2BucketName(), Key: body.key, UploadId: body.uploadId }));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر إلغاء الرفع" }, { status: 500 });
  }
}
