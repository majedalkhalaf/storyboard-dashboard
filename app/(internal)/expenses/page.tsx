import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { isInternalAdmin } from "@/app/lib/permissions";
import ExpensesClient from "@/app/components/expenses/ExpensesClient";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const session = await getCurrentSession();
  if (!isInternalAdmin(session!.profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: expenses }, { data: projects }, { data: vendors }, { data: categories }] = await Promise.all([
    supabase
      .from("expenses")
      .select("*, project:projects(name)")
      .eq("company_id", companyId)
      .order("expense_date", { ascending: false }),
    supabase.from("projects").select("id, name").eq("company_id", companyId).order("name"),
    // للربط الاختياري بمورد حقيقي من جدول vendors (بجانب حقل category الحر القديم، وليس بدلاً منه)
    supabase.from("vendors").select("id, name").eq("company_id", companyId).order("name"),
    // للربط الاختياري بتصنيف مالي حقيقي من جدول financial_categories
    supabase.from("financial_categories").select("id, name, type").eq("company_id", companyId).order("sort_order"),
  ]);

  return (
    <ExpensesClient
      companyId={companyId}
      initialExpenses={(expenses ?? []) as never[]}
      projects={(projects ?? []) as never[]}
      vendors={(vendors ?? []) as never[]}
      categories={(categories ?? []) as never[]}
    />
  );
}
