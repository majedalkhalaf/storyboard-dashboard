import { NextResponse } from "next/server";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { createR2Client, r2BucketName } from "@/app/lib/r2-client";

// حذف دفعة من كائنات R2 عند حذف صفوف "files" المرتبطة — بلا هذا المسار تبقى
// الملفات الفعلية على R2 يتيمة (الصف يُحذف من قاعدة البيانات لكن مساحة
// التخزين تتراكم بلا داعٍ).
export async function POST(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session || !session.company) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = (await request.json()) as { keys?: string[] };
    if (!body.keys || body.keys.length === 0) {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }
    const prefix = `${session.company.id}/`;
    if (!body.keys.every((k) => k.startsWith(prefix))) {
      return NextResponse.json({ error: "غير مصرح بهذا المسار" }, { status: 403 });
    }

    const client = createR2Client();
    await client.send(
      new DeleteObjectsCommand({
        Bucket: r2BucketName(),
        Delete: { Objects: body.keys.map((Key) => ({ Key })) },
      })
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر حذف الملفات" }, { status: 500 });
  }
}
