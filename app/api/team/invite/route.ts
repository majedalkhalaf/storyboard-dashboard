import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

// دعوة عضو فريق داخلي (admin | team_member). يختلف عن دعوة العميل في أنّ عضو
// الفريق يُربط بالشركة (company_id) ويأخذ دوراً داخلياً. ينشئ حساب Supabase Auth
// عبر service_role إن لم يكن موجوداً، ثم يضبط company_id/role مباشرة (يتجاوز RLS).
const ALLOWED_ROLES = ["admin", "team_member"] as const;
type TeamRole = (typeof ALLOWED_ROLES)[number];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile?.company_id || !["company_owner", "admin", "super_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "غير مصرح بدعوة أعضاء الفريق" }, { status: 403 });
  }

  const body = await request.json();
  const { email, role, fullName } = body as { email?: string; role?: string; fullName?: string };

  const cleanEmail = (email ?? "").trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return NextResponse.json({ error: "بريد إلكتروني غير صالح" }, { status: 400 });
  }
  if (!role || !ALLOWED_ROLES.includes(role as TeamRole)) {
    return NextResponse.json({ error: "دور غير صالح" }, { status: 400 });
  }
  const teamRole = role as TeamRole;
  const companyId = profile.company_id;

  const admin = createAdminClient();

  // سجل الدعوة (pending أولاً)
  const { data: inviteRow } = await admin
    .from("company_invites")
    .insert({
      company_id: companyId,
      email: cleanEmail,
      role: teamRole,
      status: "pending",
      invited_by: user.id,
    })
    .select("id")
    .single();

  // هل يملك بريد حساباً بالفعل؟
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id, company_id")
    .eq("email", cleanEmail)
    .maybeSingle();

  let targetUserId: string;
  let emailSent = false;

  if (existingProfile) {
    if (existingProfile.company_id && existingProfile.company_id !== companyId) {
      return NextResponse.json({ error: "هذا المستخدم مرتبط بشركة أخرى" }, { status: 409 });
    }
    targetUserId = existingProfile.id;
  } else {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(cleanEmail, {
      data: { role: teamRole, full_name: fullName ?? "" },
      redirectTo: `${new URL(request.url).origin}/auth/callback`,
    });
    if (inviteError || !invited.user) {
      return NextResponse.json({ error: "تعذّر إرسال دعوة البريد الإلكتروني" }, { status: 500 });
    }
    targetUserId = invited.user.id;
    emailSent = true;
  }

  // اضبط الانتماء للشركة والدور مباشرة (service_role يتجاوز RLS)
  const { error: updateError } = await admin
    .from("profiles")
    .update({
      company_id: companyId,
      role: teamRole,
      full_name: fullName?.trim() || undefined,
      must_change_password: emailSent ? true : undefined,
    })
    .eq("id", targetUserId);

  if (updateError) {
    return NextResponse.json({ error: "تعذّر ربط العضو بالشركة" }, { status: 500 });
  }

  if (inviteRow) {
    await admin
      .from("company_invites")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", inviteRow.id);
  }

  return NextResponse.json({ success: true, userId: targetUserId, emailSent });
}
