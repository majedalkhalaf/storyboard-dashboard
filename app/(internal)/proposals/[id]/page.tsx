import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import ProposalEditor from "@/app/components/proposals/ProposalEditor";
import type { Proposal } from "@/app/lib/types";

export const dynamic = "force-dynamic";

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*, projects(name), clients(name)")
    .eq("company_id", companyId)
    .eq("id", id)
    .single();

  if (!proposal) notFound();

  return (
    <ProposalEditor
      proposal={proposal as Proposal & { projects: { name: string } | null; clients: { name: string } | null }}
    />
  );
}
