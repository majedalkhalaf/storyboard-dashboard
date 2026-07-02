import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import InvoicesClient from "@/app/components/invoices/InvoicesClient";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: invoices }, { data: projects }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, number, amount, tax, status, issue_date, due_date, project_id, client_id, projects(name), clients(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("id, name, client_id").eq("company_id", companyId).order("name"),
  ]);

  return (
    <InvoicesClient
      companyId={companyId}
      initialInvoices={(invoices ?? []) as never[]}
      projects={(projects ?? []) as never[]}
    />
  );
}
