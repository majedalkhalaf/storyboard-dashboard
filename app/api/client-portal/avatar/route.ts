import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { safeStorageKey } from "@/app/lib/storage-path";

// يرفع صورة العميل الشخصية عبر service_role (العملاء ليس لديهم company_id
// فلا يستطيعون الرفع مباشرة لمساحة public-assets حسب سياسات RLS الحالية).
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
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "ملف غير صالح" }, { status: 400 });
    }

    const admin = createAdminClient();
    const path = `client-avatars/${user.id}/${safeStorageKey(file.name)}`;
    const { error: uploadError } = await admin.storage.from("public-assets").upload(path, file, { upsert: true });
    if (uploadError) {
      return NextResponse.json({ error: "تعذّر رفع الصورة" }, { status: 500 });
    }

    const { data: publicUrl } = admin.storage.from("public-assets").getPublicUrl(path);
    await admin.from("profiles").update({ avatar_url: publicUrl.publicUrl }).eq("id", user.id);

    return NextResponse.json({ url: publicUrl.publicUrl });
  } catch (err) {
    // نفس إصلاح app/api/invites/create/route.ts — يمنع استجابة فارغة غير قابلة للتحليل كـJSON
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر رفع الصورة" }, { status: 500 });
  }
}
