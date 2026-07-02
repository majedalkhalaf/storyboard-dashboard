import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import TeamClient from "@/app/components/team/TeamClient";
import { isInternalAdmin } from "@/app/lib/permissions";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;
  const admin = isInternalAdmin(session!.profile.role);

  if (!admin) {
    return (
      <div className="empty-state card">
        <p>هذا القسم متاح فقط لمالك الشركة أو المدير</p>
      </div>
    );
  }

  const { data: members } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .eq("company_id", companyId)
    .neq("role", "client")
    .order("created_at");

  const { data: invites } = await supabase
    .from("company_invites")
    .select("id, email, role, status, created_at")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <TeamClient
      currentUserId={session!.userId}
      members={members ?? []}
      invites={invites ?? []}
    />
  );
}
