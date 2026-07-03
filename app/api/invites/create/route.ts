import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { notifyUser } from "@/app/lib/server/notify";
import { DEFAULT_CLIENT_PERMISSIONS } from "@/app/lib/constants";
import type { ClientPermissions } from "@/app/lib/types";

// يُستدعى من نافذة "دعوة عميل" داخل مشروع (ClientInviteModal). ينشئ حساب Supabase
// Auth للعميل عبر service_role إن لم يكن موجوداً (يرسل Supabase بريد الدعوة تلقائياً)،
// ثم يربطه بالمشروع في project_clients بالصلاحيات المحددة.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!profile?.company_id || !["company_owner", "admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "غير مصرح بدعوة عملاء" }, { status: 403 });
    }

    const body = await request.json();
    const { projectId, email, clientName, phone, permissions } = body as {
      projectId: string;
      email: string;
      clientName: string;
      phone?: string;
      permissions?: Partial<ClientPermissions>;
    };

    if (!projectId || !email || !clientName) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id, company_id")
      .eq("id", projectId)
      .eq("company_id", profile.company_id)
      .single();
    if (!project) return NextResponse.json({ error: "المشروع غير موجود" }, { status: 404 });

    const admin = createAdminClient();

    const { data: clientRecord } = await admin
      .from("clients")
      .upsert(
        { company_id: profile.company_id, name: clientName, email, phone: phone ?? null, created_by: user.id },
        { onConflict: "company_id,email", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    let clientUserId: string | null = null;
    const { data: existingProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();

    if (existingProfile) {
      clientUserId = existingProfile.id;
    } else {
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { role: "client", full_name: clientName },
        redirectTo: `${new URL(request.url).origin}/auth/callback`,
      });
      if (inviteError || !invited.user) {
        return NextResponse.json({ error: inviteError?.message || "تعذّر إرسال دعوة البريد الإلكتروني" }, { status: 500 });
      }
      clientUserId = invited.user.id;
      await admin.from("profiles").update({ must_change_password: true }).eq("id", clientUserId);
    }

    const { data: projectClient, error: pcError } = await admin
      .from("project_clients")
      .upsert(
        {
          company_id: profile.company_id,
          project_id: projectId,
          client_id: clientRecord?.id ?? null,
          client_user_id: clientUserId,
          invited_email: email,
          status: "active",
          permissions: { ...DEFAULT_CLIENT_PERMISSIONS, ...(permissions ?? {}) },
          invited_by: user.id,
          activated_at: new Date().toISOString(),
        },
        { onConflict: "project_id,client_user_id" }
      )
      .select("id")
      .single();

    if (pcError) {
      return NextResponse.json({ error: "تعذّر ربط العميل بالمشروع" }, { status: 500 });
    }

    if (clientUserId) {
      await notifyUser({
        userId: clientUserId,
        companyId: profile.company_id,
        projectId,
        type: "project_invite",
        title: "تمت دعوتك لمتابعة مشروع",
        message: `تمت إضافتك إلى مشروع جديد. تفقّد بريدك الإلكتروني لإكمال الدخول.`,
      });
    }

    return NextResponse.json({ success: true, projectClientId: projectClient.id });
  } catch (err) {
    // أي خطأ غير متوقع (مثل غياب SUPABASE_SERVICE_ROLE_KEY من متغيرات البيئة) كان
    // يوقف الدالة بلا استجابة JSON صالحة، فيظهر للمستخدم خطأ "Unexpected end of JSON
    // input" غير مفهوم بدل رسالة واضحة — الآن يُرجع دائماً JSON صالحاً فيه سبب الفشل.
    return NextResponse.json({ error: err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إرسال الدعوة" }, { status: 500 });
  }
}
