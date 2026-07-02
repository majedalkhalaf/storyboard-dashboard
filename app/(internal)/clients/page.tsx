import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import ClientsClient from "@/app/components/clients/ClientsClient";
import type { ClientRecord } from "@/app/lib/types";

export default async function ClientsPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: clients }, { data: links }] = await Promise.all([
    supabase.from("clients").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    supabase.from("project_clients").select("client_id, status").eq("company_id", companyId),
  ]);

  const activeCounts: Record<string, number> = {};
  for (const link of links ?? []) {
    if (link.status === "active" && link.client_id) {
      activeCounts[link.client_id] = (activeCounts[link.client_id] ?? 0) + 1;
    }
  }

  return (
    <ClientsClient
      initialClients={(clients as ClientRecord[]) ?? []}
      activeCounts={activeCounts}
      companyId={companyId}
      userId={session!.userId}
    />
  );
}
