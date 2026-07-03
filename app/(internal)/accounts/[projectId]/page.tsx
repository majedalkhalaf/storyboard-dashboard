import { notFound } from "next/navigation";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { createClient } from "@/app/lib/supabase/server";
import { getProjectAccountData } from "@/app/lib/project-account";
import AccountDetailClient from "@/app/components/finance/accounts/AccountDetailClient";

export const dynamic = "force-dynamic";

export default async function ProjectAccountPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const session = await getCurrentSession();
  const companyId = session!.company!.id;

  const [data, supabase] = await Promise.all([getProjectAccountData(companyId, projectId), createClient()]);
  if (!data) notFound();

  const { data: vendorRows } = await supabase.from("vendors").select("id, name").eq("company_id", companyId).order("name");

  return <AccountDetailClient data={data} companyId={companyId} vendors={(vendorRows ?? []) as { id: string; name: string }[]} />;
}
