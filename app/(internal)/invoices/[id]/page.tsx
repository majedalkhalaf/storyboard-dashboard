import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import InvoiceDetail from "@/app/components/invoices/InvoiceDetail";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, projects(name), clients(name, email, phone)")
    .eq("company_id", companyId)
    .eq("id", id)
    .single();

  if (!invoice) notFound();

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("company_id", companyId)
    .eq("invoice_id", id)
    .order("created_at", { ascending: false });

  return (
    <InvoiceDetail
      companyId={companyId}
      invoice={invoice as never}
      initialPayments={(payments ?? []) as never[]}
    />
  );
}
