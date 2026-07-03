import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { isInternalAdmin } from "@/app/lib/permissions";
import InvitationsLogClient, { type InvitationRow } from "@/app/components/settings/InvitationsLogClient";

export const dynamic = "force-dynamic";

export default async function InvitationsLogPage() {
  const session = await getCurrentSession();
  if (!isInternalAdmin(session!.profile.role)) redirect("/dashboard");

  const companyId = session!.company!.id;

  // فحص انتهاء صلاحية كسول (Lazy Expiry): يُنفَّذ فقط عند تحميل هذه الصفحة —
  // ليس مهمة خلفية دورية حقيقية (لا يوجد cron في هذا المشروع). يحوّل أي دعوة
  // تجاوزت expires_at وما زالت في حالة انتظار/إرسال/فتح إلى "منتهية" قبل العرض.
  // التحديث الفعلي يتطلب صلاحية أعلى من سياسة RLS الوحيدة الموجودة (SELECT فقط
  // لمدير الشركة)، لذا نستخدم createAdminClient() هنا تحديداً بدل عميل الخادم
  // العادي الذي يُستخدم لبقية هذه الصفحة (قراءة فقط).
  const admin = createAdminClient();
  await admin
    .from("invitations")
    .update({ status: "expired" })
    .eq("company_id", companyId)
    .in("status", ["pending", "sent", "opened"])
    .not("expires_at", "is", null)
    .lt("expires_at", new Date().toISOString());

  const supabase = await createClient();
  const { data: invitations } = await supabase
    .from("invitations")
    .select("*, project:projects(name), inviter:profiles!invitations_invited_by_fkey(full_name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  return <InvitationsLogClient invitations={(invitations ?? []) as unknown as InvitationRow[]} />;
}
