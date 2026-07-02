import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import ContractEditor from "@/app/components/contracts/ContractEditor";
import type { Contract } from "@/app/lib/types";

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, projects(name), clients(name)")
    .eq("company_id", companyId)
    .eq("id", id)
    .single();

  if (!contract) notFound();

  const { data: services } = await supabase
    .from("project_services")
    .select("label, category")
    .eq("project_id", contract.project_id);

  return (
    <ContractEditor
      contract={contract as Contract & { projects: { name: string } | null; clients: { name: string } | null }}
      projectServices={services ?? []}
    />
  );
}
