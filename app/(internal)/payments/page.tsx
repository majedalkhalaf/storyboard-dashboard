import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { isInternalAdmin } from "@/app/lib/permissions";
import PaymentsClient from "@/app/components/payments/PaymentsClient";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await getCurrentSession();
  if (!isInternalAdmin(session!.profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: payments }, { data: projects }, { data: invoices }] = await Promise.all([
    supabase
      .from("payments")
      .select("*, project:projects(name), invoice:invoices(number)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("id, name").eq("company_id", companyId).order("name"),
    supabase
      .from("invoices")
      .select("id, number, amount, project_id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <PaymentsClient
      companyId={companyId}
      initialPayments={(payments ?? []) as never[]}
      projects={(projects ?? []) as never[]}
      invoices={(invoices ?? []) as never[]}
    />
  );
}
