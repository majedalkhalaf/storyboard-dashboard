import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import ProposalsClient from "@/app/components/proposals/ProposalsClient";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, title, type, status, created_at, project_id, client_id, projects(name), clients(name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, client_id")
    .eq("company_id", companyId)
    .eq("archived", false)
    .order("name");

  return (
    <ProposalsClient
      companyId={companyId}
      proposals={(proposals ?? []) as never[]}
      projects={projects ?? []}
    />
  );
}
