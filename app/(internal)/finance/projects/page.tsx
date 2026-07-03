import { getCurrentSession } from "@/app/lib/supabase/session";
import { getFinanceDashboardData } from "@/app/lib/finance-dashboard";
import FinancialProjectsClient from "@/app/components/finance/projects/FinancialProjectsClient";

export const dynamic = "force-dynamic";

export default async function FinanceProjectsPage() {
  const session = await getCurrentSession();
  const companyId = session!.company!.id;
  const data = await getFinanceDashboardData(companyId);

  return <FinancialProjectsClient projects={data.projects} />;
}
