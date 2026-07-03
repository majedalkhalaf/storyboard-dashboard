import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { isInternalAdmin } from "@/app/lib/permissions";
import type { CompanyWhatsappConfigPublic } from "@/app/lib/types";

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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const body = await request.json();
    const { label, phoneNumberId, businessPhoneDisplay, accessToken } = body as {
      label?: string;
      phoneNumberId?: string;
      businessPhoneDisplay?: string;
      accessToken?: string;
    };

    const admin = createAdminClient();
    const patch: Record<string, unknown> = {};
    if (label !== undefined) patch.label = label;
    if (phoneNumberId !== undefined) patch.phone_number_id = phoneNumberId;
    if (businessPhoneDisplay !== undefined) patch.business_phone_display = businessPhoneDisplay || null;
    // التوكن يُحدَّث فقط إن أُرسل فعلياً (غير فارغ) — لا نمسحه لمجرد عدم إرساله من نموذج تعديل
    if (accessToken) patch.access_token = accessToken;

    const { data, error } = await admin
      .from("company_whatsapp_config")
      .update(patch)
      .eq("id", id)
      .eq("company_id", auth.companyId)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "تعذّر تحديث إعداد واتساب بزنس" }, { status: 500 });
    }
    return NextResponse.json({ config: toPublic(data) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر تحديث إعداد واتساب بزنس" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const admin = createAdminClient();
    const { error } = await admin.from("company_whatsapp_config").delete().eq("id", id).eq("company_id", auth.companyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر حذف إعداد واتساب بزنس" }, { status: 500 });
  }
}
