import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { isInternalAdmin } from "@/app/lib/permissions";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
    if (!profile?.company_id || !isInternalAdmin(profile.role)) {
      return NextResponse.json({ error: "غير مصرح — للمدراء فقط" }, { status: 403 });
    }

    const admin = createAdminClient();
    // إلغاء تفعيل الإعداد الحالي أولاً ثم تفعيل الجديد — يفرضه أيضاً unique index جزئي في القاعدة
    await admin.from("company_whatsapp_config").update({ is_active: false }).eq("company_id", profile.company_id);
    const { error } = await admin.from("company_whatsapp_config").update({ is_active: true }).eq("id", id).eq("company_id", profile.company_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر تفعيل إعداد واتساب بزنس" }, { status: 500 });
  }
}
