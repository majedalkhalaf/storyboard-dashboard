import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { isInternalAdmin } from "@/app/lib/permissions";
import type { CompanyEmailSenderPublic } from "@/app/lib/types";

// إدارة "بريد الإرسال المخصص" (SMTP) للشركة. يمر عبر هذا المسار حصراً (وليس عبر
// عميل Supabase مباشرة من الواجهة) لأن الجدول لا يحمل أي سياسة RLS عمداً —
// smtp_password حساس، فلا يجب أن يُعاد على الإطلاق لأي طلب واجهة، ولا يُقرأ إلا
// هنا عبر service_role عند الإرسال الفعلي فقط.

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

export async function GET() {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const admin = createAdminClient();
    const { data } = await admin.from("company_email_senders").select("*").eq("company_id", auth.companyId).order("created_at");
    return NextResponse.json({ senders: (data ?? []).map(toPublic) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر تحميل قائمة البريد المرسِل" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return auth.error;

    const body = await request.json();
    const { label, fromName, fromEmail, smtpHost, smtpPort, smtpSecure, smtpUsername, smtpPassword, isDefault } = body as {
      label?: string;
      fromName?: string;
      fromEmail?: string;
      smtpHost?: string;
      smtpPort?: number;
      smtpSecure?: boolean;
      smtpUsername?: string;
      smtpPassword?: string;
      isDefault?: boolean;
    };

    if (!label || !fromName || !fromEmail || !smtpHost || !smtpPort || !smtpUsername || !smtpPassword) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة (باستثناء تفعيل كافتراضي)" }, { status: 400 });
    }

    const admin = createAdminClient();

    // فرض "افتراضي واحد فقط" على مستوى التطبيق أيضاً (بجانب unique index الجزئي في القاعدة)
    if (isDefault) {
      await admin.from("company_email_senders").update({ is_default: false }).eq("company_id", auth.companyId);
    }

    const { data, error } = await admin
      .from("company_email_senders")
      .insert({
        company_id: auth.companyId,
        label,
        from_name: fromName,
        from_email: fromEmail,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_secure: Boolean(smtpSecure),
        smtp_username: smtpUsername,
        smtp_password: smtpPassword,
        is_default: Boolean(isDefault),
        created_by: auth.userId,
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "تعذّر إضافة بريد الإرسال" }, { status: 500 });
    }

    return NextResponse.json({ sender: toPublic(data) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "تعذّر إضافة بريد الإرسال" }, { status: 500 });
  }
}
