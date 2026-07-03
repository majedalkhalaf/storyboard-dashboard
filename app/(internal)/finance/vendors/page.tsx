import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { isInternalAdmin } from "@/app/lib/permissions";
import VendorsClient, { type VendorExpenseRow } from "@/app/components/finance/vendors/VendorsClient";
import type { Vendor } from "@/app/lib/types";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const session = await getCurrentSession();
  if (!isInternalAdmin(session!.profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: vendors }, { data: expenses }] = await Promise.all([
    supabase.from("vendors").select("*").eq("company_id", companyId).order("name"),
    supabase
      .from("expenses")
      .select("id, vendor_id, title, amount, expense_date, project:projects(name)")
      .eq("company_id", companyId)
      .not("vendor_id", "is", null)
      .order("expense_date", { ascending: false }),
  ]);

  return (
    <VendorsClient
      companyId={companyId}
      initialVendors={(vendors ?? []) as Vendor[]}
      vendorExpenses={(expenses ?? []) as unknown as VendorExpenseRow[]}
    />
  );
}
