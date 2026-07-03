import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { isInternalAdmin } from "@/app/lib/permissions";
import type { CompanyEmailSenderPublic } from "@/app/lib/types";

function toPublic(row: Record<string, unknown>): CompanyEmailSenderPublic {
  const { smtp_password: _omit, ...rest } = row;
  void _omit;
  return rest as unknown as CompanyEmailSenderPublic;
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
    const { label, fromName, fromEmail, smtpHost, smtpPort, smtpSecure, smtpUsername, smtpPassword } = body as {
      label?: string;
      fromName?: string;
      fromEmail?: string;
      smtpHost?: string;
      smtpPort?: number;
      smtpSecure?: boolean;
      smtpUsername?: string;
      smtpPassword?: string;
    };

    const admin = createAdminClient();
    const patch: Record<string, unknown> = {};
    if (label !== undefined) patch.label = label;
    if (fromName !== undefined) patch.from_name = fromName;
    if (fromEmail !== undefined) patch.from_email = fromEmail;
    if (smtpHost !== undefined) patch.smtp_host = smtpHost;
    if (smtpPort !== undefined) patch.smtp_port = smtpPort;
    if (smtpSecure !== undefined) patch.smtp_secure = smtpSecure;
    if (smtpUsername !== undefined) patch.smtp_username = smtpUsername;
    // كلمة المرور تُحدَّث فقط إن أُرسلت فعلياً (غير فارغة) — لا نمسحها لمجرد عدم إرسالها من نموذج تعديل
    if (smtpPassword) patch.smtp_password = smtpPassword;

    const { data, error } = await admin
      .from("company_email_senders")
      .update(patch)
      .eq("id", id)
      .eq("company_id", auth.companyId)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "تعذّر تحديث بريد الإرسال" }, { status: 500 });
    }
    return NextResponse.json({ sender: toPublic(data) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر تحديث بريد الإرسال" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;
    const { id } = await params;

    const admin = createAdminClient();
    const { error } = await admin.from("company_email_senders").delete().eq("id", id).eq("company_id", auth.companyId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر حذف بريد الإرسال" }, { status: 500 });
  }
}
