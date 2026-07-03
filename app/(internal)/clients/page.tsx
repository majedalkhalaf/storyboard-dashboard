import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { getClientsDirectory } from "@/app/lib/clients-directory";
import ClientsWorkspace from "@/app/components/clients/ClientsWorkspace";

export default async function ClientsPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ clients, stats }, { data: teamMembers }] = await Promise.all([
    getClientsDirectory(companyId),
    supabase.from("profiles").select("id, full_name").eq("company_id", companyId).neq("role", "client").order("full_name"),
  ]);

  return (
    <ClientsWorkspace
      initialRows={clients}
      stats={stats}
      companyId={companyId}
      userId={session!.userId}
      teamMembers={teamMembers ?? []}
    />
  );
}
