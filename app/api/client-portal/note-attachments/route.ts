import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { canClient } from "@/app/lib/permissions";
import { safeStorageKey } from "@/app/lib/storage-path";
import type { ClientPermissions } from "@/app/lib/types";

// حد حجم آمن لكل مرفق — نمرّر الملف عبر دالة الخادم بمفتاح service_role (نفس
// نمط رفع صورة العميل الشخصية)، وهذا المسار محدود عملياً بحجم الطلب الذي تقبله
// دالة Netlify، لذا هذا الحد مخصَّص لمرفقات مرجعية (صور/تسجيل صوتي قصير/مستند)
// وليس لرفع فيديوهات خام كاملة — تلك تبقى عبر نظام ملفات فريق العمل الداخلي.
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

// يرفع مرفقات "طلب التعديل" (صورة/فيديو قصير/تسجيل صوتي/مستند) نيابة عن
// العميل، بعد التحقق من صلاحية upload_attachments على مشروعه تحديداً — العميل
// لا يملك صلاحية RLS للرفع المباشر لمساحة التخزين، فيمر عبر service_role هنا.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "client") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get("file");
    const projectId = formData.get("projectId");
    if (!(file instanceof File) || typeof projectId !== "string" || !projectId) {
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: "حجم الملف يتجاوز الحد المسموح (15 ميجابايت)" }, { status: 413 });
    }

    const { data: pc } = await supabase
      .from("project_clients")
      .select("permissions")
      .eq("project_id", projectId)
      .eq("client_user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    const permissions = pc?.permissions as ClientPermissions | undefined;
    if (!canClient(permissions, "upload_attachments")) {
      return NextResponse.json({ error: "لا تملك صلاحية رفع مرفقات لهذا المشروع" }, { status: 403 });
    }

    const admin = createAdminClient();
    const path = `note-attachments/${projectId}/${user.id}/${safeStorageKey(file.name)}`;
    const { error: uploadError } = await admin.storage.from("public-assets").upload(path, file, { upsert: false, contentType: file.type || undefined });
    if (uploadError) {
      return NextResponse.json({ error: "تعذّر رفع المرفق" }, { status: 500 });
    }

    const { data: publicUrl } = admin.storage.from("public-assets").getPublicUrl(path);
    return NextResponse.json({ name: file.name, url: publicUrl.publicUrl, type: file.type || null });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر رفع المرفق" }, { status: 500 });
  }
}
