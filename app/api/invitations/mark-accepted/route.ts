import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// يُستدعى من صفحة تعيين كلمة المرور الإجبارية للعميل (قناة واتساب/SMS بكلمة مرور
// مؤقتة) بعد نجاح أول تغيير كلمة مرور فعلي — وهو "قبول" حقيقي للدعوة، وليس تخميناً.
// لا صلاحية إدارية مطلوبة من المستدعي؛ يؤثر فقط على دعوات المستخدم المصادَق نفسه.
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const admin = createAdminClient();
    const { data: latest } = await admin
      .from("invitations")
      .select("id")
      .eq("client_user_id", user.id)
      .in("status", ["sent", "opened"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest) {
      await admin.from("invitations").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", latest.id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "خطأ غير متوقع" }, { status: 500 });
  }
}
