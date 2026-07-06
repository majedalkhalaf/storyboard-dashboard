import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { canClient } from "@/app/lib/permissions";
import { createR2Client, r2BucketName, r2PublicUrl } from "@/app/lib/r2-client";

// يُرجع رابطاً موقّتاً موقّعاً (signed URL) لملف من مساحة project-files الخاصة،
// بعد التحقق أن المستخدم عميل نشط على المشروع ولديه صلاحية الملفات (وصلاحية
// التحميل تحديداً إن كان الطلب ?download=1). العميل لا يملك وصولاً مباشراً
// لهذه المساحة عبر RLS، لذا هذا المسار (بصلاحية service_role) هو الطريقة الوحيدة.
export async function GET(request: Request, { params }: { params: Promise<{ fileId: string }> }) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const isDownload = searchParams.get("download") === "1";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "client") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const admin = createAdminClient();

    const { data: file } = await admin.from("files").select("*").eq("id", fileId).maybeSingle();
    if (!file || !file.client_visible || !file.client_can_view || !file.storage_path) {
      return NextResponse.json({ error: "الملف غير متاح" }, { status: 404 });
    }
    if (isDownload && !file.client_can_download) {
      return NextResponse.json({ error: "غير مصرح بتحميل هذا الملف" }, { status: 403 });
    }

    const { data: pc } = await admin
      .from("project_clients")
      .select("permissions, status")
      .eq("project_id", file.project_id)
      .eq("client_user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!pc || !canClient(pc.permissions, "files") || (isDownload && !canClient(pc.permissions, "download_files"))) {
      return NextResponse.json({ error: "غير مصرح بالوصول لهذا الملف" }, { status: 403 });
    }

    // ملفات الفيديو الكبيرة مخزَّنة على Cloudflare R2 بدل Supabase Storage. العرض/التشغيل
    // يستخدم الرابط العام المباشر (bucket عام)، والتحميل القسري بالاسم الأصلي يحتاج
    // رابطاً موقّعاً (الرابط العام لا يفرض Content-Disposition).
    if (file.bucket_name === "r2") {
      if (isDownload) {
        const r2 = createR2Client();
        const command = new GetObjectCommand({
          Bucket: r2BucketName(),
          Key: file.storage_path,
          ResponseContentDisposition: `attachment; filename="${encodeURIComponent(file.original_name || file.name)}"`,
        });
        const url = await getSignedUrl(r2, command, { expiresIn: 3600 });
        return NextResponse.json({ url });
      }
      return NextResponse.json({ url: r2PublicUrl(file.storage_path) });
    }

    // ساعة كاملة بدل 5 دقائق — مدة قصيرة كانت تكفي لفتح مستند لكن تنقطع أثناء
    // مشاهدة فيديو طويل (المتصفح يعيد طلب الرابط نفسه لكل طلب Range أثناء التقديم).
    const { data: signed, error } = await admin.storage.from(file.bucket_name || "project-files").createSignedUrl(file.storage_path, 3600);
    if (error || !signed) {
      return NextResponse.json({ error: "تعذّر إنشاء رابط التحميل" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (err) {
    // نفس إصلاح app/api/invites/create/route.ts — يمنع استجابة فارغة غير قابلة للتحليل كـJSON
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر إنشاء رابط التحميل" }, { status: 500 });
  }
}
