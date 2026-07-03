import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { isInternalAdmin } from "@/app/lib/permissions";
import type { CompanyWhatsappConfigPublic } from "@/app/lib/types";

// إدارة إعدادات "واتساب بزنس API" للشركة. يمر عبر هذا المسار حصراً (وليس عبر
// عميل Supabase مباشرة من الواجهة) لأن الجدول لا يحمل أي سياسة RLS عمداً —
// access_token حساس، فلا يجب أن يُعاد على الإطلاق لأي طلب واجهة، ولا يُقرأ إلا
// هنا عبر service_role عند الإرسال الفعلي فقط.

function toPublic(row: Record<string, unknown>): CompanyWhatsappConfigPublic {
  const { access_token: _omit, ...rest } = row;
  void _omit;
  return rest as unknown as CompanyWhatsappConfigPublic;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "غير مصرح" }, { status: 401 }) };

  const { data: profile } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  if (!profile?.company_id || !isInternalAdmin(profile.role)) {
    return { error: NextResponse.json({ error: "غير مصرح — للمدراء فقط" }, { status: 403 }) };
  }
  return { companyId: profile.company_id as string, userId: user.id };
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const admin = createAdminClient();
    const { data } = await admin.from("company_whatsapp_config").select("*").eq("company_id", auth.companyId).order("created_at");
    return NextResponse.json({ configs: (data ?? []).map(toPublic) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر تحميل إعدادات واتساب بزنس" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { label, phoneNumberId, businessPhoneDisplay, accessToken, isActive } = body as {
      label?: string;
      phoneNumberId?: string;
      businessPhoneDisplay?: string;
      accessToken?: string;
      isActive?: boolean;
    };

    if (!label || !phoneNumberId || !accessToken) {
      return NextResponse.json({ error: "الاسم التعريفي ومعرّف رقم الهاتف والتوكن كلها مطلوبة" }, { status: 400 });
    }

    const admin = createAdminClient();

    // فرض "إعداد نشط واحد فقط" على مستوى التطبيق أيضاً (بجانب unique index الجزئي في القاعدة)
    if (isActive) {
      await admin.from("company_whatsapp_config").update({ is_active: false }).eq("company_id", auth.companyId);
    }

    const { data, error } = await admin
      .from("company_whatsapp_config")
      .insert({
        company_id: auth.companyId,
        label,
        phone_number_id: phoneNumberId,
        business_phone_display: businessPhoneDisplay || null,
        access_token: accessToken,
        is_active: Boolean(isActive),
        created_by: auth.userId,
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "تعذّر إضافة إعداد واتساب بزنس" }, { status: 500 });
    }

    return NextResponse.json({ config: toPublic(data) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر إضافة إعداد واتساب بزنس" }, { status: 500 });
  }
}
