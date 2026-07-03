import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { isInternalAdmin } from "@/app/lib/permissions";
import CategoriesClient from "@/app/components/finance/categories/CategoriesClient";
import type { FinancialCategory } from "@/app/lib/types";

export const dynamic = "force-dynamic";

export default async function FinancialCategoriesPage() {
  const session = await getCurrentSession();
  if (!isInternalAdmin(session!.profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: categories }, { data: expenses }] = await Promise.all([
    supabase
      .from("financial_categories")
      .select("*")
      .eq("company_id", companyId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("expenses")
      .select("category_id, amount")
      .eq("company_id", companyId)
      .not("category_id", "is", null),
  ]);

  const stats: Record<string, { count: number; total: number }> = {};
  for (const e of (expenses ?? []) as { category_id: string | null; amount: number }[]) {
    if (!e.category_id) continue;
    const entry = stats[e.category_id] ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += Number(e.amount);
    stats[e.category_id] = entry;
  }

  return (
    <CategoriesClient
      companyId={companyId}
      initialCategories={(categories ?? []) as FinancialCategory[]}
      stats={stats}
    />
  );
}
