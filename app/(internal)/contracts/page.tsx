import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import ContractsClient from "@/app/components/contracts/ContractsClient";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, title, status, version, created_at, project_id, client_id, projects(name), clients(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .eq("company_id", companyId)
    .eq("archived", false)
    .order("name");

  return (
    <ContractsClient
      companyId={companyId}
      contracts={(contracts ?? []) as never[]}
      projects={projects ?? []}
    />
  );
}
