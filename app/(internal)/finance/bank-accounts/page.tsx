import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { isInternalAdmin } from "@/app/lib/permissions";
import BankAccountsClient, { type AccountWithBalance } from "@/app/components/finance/bank-accounts/BankAccountsClient";
import type { BankAccount, BankTransaction } from "@/app/lib/types";

export const dynamic = "force-dynamic";

export default async function BankAccountsPage() {
  const session = await getCurrentSession();
  if (!isInternalAdmin(session!.profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase.from("bank_accounts").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    supabase
      .from("bank_transactions")
      .select("*")
      .eq("company_id", companyId)
      .order("transaction_date", { ascending: false }),
  ]);

  const txByAccount = new Map<string, BankTransaction[]>();
  for (const t of (transactions ?? []) as BankTransaction[]) {
    const list = txByAccount.get(t.bank_account_id) ?? [];
    list.push(t);
    txByAccount.set(t.bank_account_id, list);
  }

  // الرصيد الحالي = الرصيد الافتتاحي + الإيداعات/التحويلات الواردة - السحوبات/التحويلات الصادرة.
  // يُحسب هنا في الخادم لكل طلب صفحة، ولا يُخزَّن كعمود منفصل.
  const accountsWithBalance: AccountWithBalance[] = ((accounts ?? []) as BankAccount[]).map((a) => {
    const txs = txByAccount.get(a.id) ?? [];
    const balance = txs.reduce((sum, t) => {
      const signed = t.type === "deposit" || t.type === "transfer_in" ? Number(t.amount) : -Number(t.amount);
      return sum + signed;
    }, Number(a.opening_balance));
    return { ...a, balance, transactions: txs };
  });

  return <BankAccountsClient companyId={companyId} initialAccounts={accountsWithBalance} />;
}
