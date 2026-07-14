import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { canClient } from "@/app/lib/permissions";
import { createR2Client, r2BucketName, r2PublicUrl } from "@/app/lib/r2-client";

function contentDisposition(rawName: string): string {
  // اسم عربي/يونيكود داخل Content-Disposition يحتاج الصيغة القياسية filename*=UTF-8''
  // (RFC 6266) مع اسم احتياطي ASCII فقط — متصفحات كثيرة لا تفكّ ترميز filename="%.."
  // العادي تلقائياً فيظهر اسم الملف المحمَّل حرفياً بصيغته المرمَّزة بدل اسمه الحقيقي.
  const asciiFallback = rawName.replace(/[^\x20-\x7E]/g, "_");
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(rawName)}`;
}

// يُرجع رابط الملف الفعلي (مباشرة من Cloudflare R2 أو رابطاً موقّتاً موقّعاً من
// Supabase Storage) بعد التحقق أن المستخدم عميل نشط على المشروع ولديه صلاحية
// الملفات (وصلاحية التحميل تحديداً إن كان الطلب ?download=1). العميل لا يملك
// وصولاً مباشراً لهذه المساحة عبر RLS، لذا هذا المسار (بصلاحية service_role) هو
// الطريقة الوحيدة للتحقق من الصلاحية قبل تسليم الرابط.
//
// بالنسبة لملفات الفيديو الكبيرة تحديداً: كان هذا المسار يسحب الملف على خادمنا
// ويعيد بثّه (stream) كاستجابة من نفس الأصل — لكن ذلك عرّض تنزيل الفيديوهات
// الطويلة لخطر توقّف الدالة السحابية (Netlify) منتصف النقل إن تجاوز الوقت
// مهلة تنفيذها، فينتج ملفاً مبتوراً (يعمل لدقيقة أو دقيقتين فقط رغم ظهور المدة
// الصحيحة). الآن يُعاد رابط الملف الفعلي مباشرة، ويقوم المتصفح بجلب البايتات
// من مصدرها مباشرة (R2/Supabase) بلا أي حد زمني على النقل نفسه.
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

    const rawName = file.original_name || file.name;

    if (file.bucket_name === "r2") {
      if (isDownload) {
        // رابط موقّع (presigned) يفرض Content-Disposition: attachment من R2 نفسه —
        // يعمل بشكل صحيح حتى مع تنزيل مباشر (بلا قراءة JS للبايتات) على الجوال،
        // بخلاف الرابط العام المستخدم للعرض فقط الذي لا يفرض تنزيلاً أبداً.
        const r2 = createR2Client();
        const url = await getSignedUrl(
          r2,
          new GetObjectCommand({ Bucket: r2BucketName(), Key: file.storage_path, ResponseContentDisposition: contentDisposition(rawName) }),
          { expiresIn: 3600 }
        );
        return NextResponse.json({ url });
      }
      return NextResponse.json({ url: r2PublicUrl(file.storage_path) });
    }

    // ساعة كاملة تكفي لتنزيل ملفات كبيرة على اتصال بطيء دون انتهاء صلاحية الرابط أثناء النقل.
    const { data: signed, error } = await admin.storage
      .from(file.bucket_name || "project-files")
      .createSignedUrl(file.storage_path, 3600, isDownload ? { download: rawName } : undefined);
    if (error || !signed) {
      return NextResponse.json({ error: "تعذّر إنشاء رابط التحميل" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (err) {
    // نفس إصلاح app/api/invites/create/route.ts — يمنع استجابة فارغة غير قابلة للتحليل كـJSON
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر إنشاء رابط التحميل" }, { status: 500 });
  }
}
