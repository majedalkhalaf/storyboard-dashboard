import { NextResponse } from "next/server";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { createR2Client, r2BucketName } from "@/app/lib/r2-client";
import { buildFilePath } from "@/app/lib/storage-path";
import type { FileCategory } from "@/app/lib/types";

// يبدأ رفعاً مجزّأً (multipart) جديداً على Cloudflare R2 — لفريق العمل الداخلي
// فقط (لا يوجد رفع فيديو من جهة العميل). الملف نفسه لا يمر عبر هذا المسار
// إطلاقاً؛ فقط الطلب الصغير لبدء الرفع، فلا قيود على حجم الطلب هنا.
export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || !session.company) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = (await request.json()) as {
      fileName?: string;
      contentType?: string;
      projectId?: string;
      episodeId?: string | null;
      category?: FileCategory;
    };
    if (!body.fileName || !body.projectId || !body.category) {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }

    const key = buildFilePath({
      companyId: session.company.id,
      projectId: body.projectId,
      episodeId: body.episodeId ?? null,
      category: body.category,
      originalName: body.fileName,
    });

    const client = createR2Client();
    const result = await client.send(
      new CreateMultipartUploadCommand({
        Bucket: r2BucketName(),
        Key: key,
        ContentType: body.contentType || "application/octet-stream",
      })
    );

    return NextResponse.json({ uploadId: result.UploadId, key });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر بدء الرفع" }, { status: 500 });
  }
}
