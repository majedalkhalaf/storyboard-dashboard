// طبقة بيانات "حساب المشروع" المستقل — كل مشروع كحساب بنكي خاص به: كل الاستعلامات هنا
// محصورة بـ project_id واحد (بالإضافة إلى company_id للأمان)، بخلاف finance-dashboard.ts
// التي تُجمِّع عبر كل مشاريع الشركة.
import { createClient } from "@/app/lib/supabase/server";
import type { Payment, Expense, Project } from "@/app/lib/types";
import { computeFinancialHealth, type FinancialHealth } from "@/app/lib/chart-colors";

export interface ProjectAccountPayment {
  id: string;
  amount: number;
  status: Payment["status"];
  method: string | null;
  due_date: string | null;
  paid_date: string | null;
  invoice_number: string | null;
  reference_number: string | null;
  notes: string | null;
  receipt_url: string | null;
}

export interface ProjectAccountExpense {
  id: string;
  title: string;
  amount: number;
  expense_date: string;
  category: string | null;
  payment_method: string | null;
  vendor_name: string | null;
  attachment_url: string | null;
}

export interface ProjectAccountActivity {
  id: string;
  actor_role: string | null;
  actor_name: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ProjectAccountData {
  project: {
    id: string;
    code: string | null;
    name: string;
    status: string;
    clientName: string | null;
    budget: number;
  };
  contractValue: number;
  paidFromPayments: number;
  remainingFromBudget: number;
  totalExpenses: number;
  profitFromBudget: number;
  profitabilityRate: number;
  health: FinancialHealth;
  monthly: { label: string; revenue: number; expenses: number }[];
  payments: ProjectAccountPayment[];
  dues: ProjectAccountPayment[];
  expenses: ProjectAccountExpense[];
  activity: ProjectAccountActivity[];
}

const MONTH_LABELS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

// أسماء العمليات المرتبطة فعلياً بالحساب المالي — سجل النشاط العام للمشروع (تغييرات
// الحالة، الحلقات...) لا يظهر هنا لأنه ليس "عملية حساب"، بل يظهر في تبويب النشاط
// العام للمشروع نفسه.
const FINANCE_ACTIONS = ["expense_added", "payment_added", "payment_marked_paid"];

export async function getProjectAccountData(companyId: string, projectId: string): Promise<ProjectAccountData | null> {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("id, code, name, status, client_id, budget")
    .eq("company_id", companyId)
    .eq("id", projectId)
    .maybeSingle();
  if (!projectRow) return null;
  const project = projectRow as Pick<Project, "id" | "code" | "name" | "status" | "client_id" | "budget">;

  const [{ data: clientRow }, { data: paymentRows }, { data: expenseRows }, { data: activityRows }] = await Promise.all([
    project.client_id ? supabase.from("clients").select("name").eq("id", project.client_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from("payments")
      .select("id, amount, status, method, due_date, paid_date, reference_number, notes, receipt_url, invoice:invoices(number)")
      .eq("company_id", companyId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("id, title, amount, expense_date, category, payment_method, attachment_url, vendor:vendors(name)")
      .eq("company_id", companyId)
      .eq("project_id", projectId)
      .order("expense_date", { ascending: false }),
    supabase
      .from("activity_logs")
      .select("id, actor_role, actor_name, action, details, created_at")
      .eq("company_id", companyId)
      .eq("project_id", projectId)
      .in("action", FINANCE_ACTIONS)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const rawPayments = (paymentRows ?? []) as unknown as (Pick<
    Payment,
    "id" | "amount" | "status" | "method" | "due_date" | "paid_date" | "reference_number" | "notes" | "receipt_url"
  > & {
    invoice: { number: string } | null;
  })[];
  const payments: ProjectAccountPayment[] = rawPayments.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    status: p.status,
    method: p.method,
    due_date: p.due_date,
    paid_date: p.paid_date,
    invoice_number: p.invoice?.number ?? null,
    reference_number: p.reference_number,
    notes: p.notes,
    receipt_url: p.receipt_url,
  }));

  const rawExpenses = (expenseRows ?? []) as unknown as (Pick<
    Expense,
    "id" | "title" | "amount" | "expense_date" | "category" | "payment_method" | "attachment_url"
  > & {
    vendor: { name: string } | null;
  })[];
  const expenses: ProjectAccountExpense[] = rawExpenses.map((e) => ({
    id: e.id,
    title: e.title,
    amount: Number(e.amount),
    expense_date: e.expense_date,
    category: e.category,
    payment_method: e.payment_method,
    vendor_name: e.vendor?.name ?? null,
    attachment_url: e.attachment_url,
  }));

  const budget = Number(project.budget ?? 0);
  const paidFromPayments = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const profitFromBudget = paidFromPayments - totalExpenses;
  const remainingFromBudget = budget - paidFromPayments;
  const profitabilityRate = budget > 0 ? (profitFromBudget / budget) * 100 : 0;
  const dues = payments.filter((p) => p.status === "pending" || p.status === "overdue");
  const hasOverdue = payments.some((p) => p.status === "overdue");

  const now = new Date();
  const monthly: { label: string; revenue: number; expenses: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const revenue = payments
      .filter((p) => p.status === "paid" && p.paid_date && new Date(p.paid_date) >= start && new Date(p.paid_date) < end)
      .reduce((s, p) => s + p.amount, 0);
    const exp = expenses
      .filter((e) => e.expense_date && new Date(e.expense_date) >= start && new Date(e.expense_date) < end)
      .reduce((s, e) => s + e.amount, 0);
    monthly.push({ label: MONTH_LABELS_AR[start.getMonth()], revenue, expenses: exp });
  }

  return {
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      clientName: (clientRow as { name: string } | null)?.name ?? null,
      budget,
    },
    contractValue: budget,
    paidFromPayments,
    remainingFromBudget,
    totalExpenses,
    profitFromBudget,
    profitabilityRate,
    health: computeFinancialHealth({ collectionRate: budget > 0 ? (paidFromPayments / budget) * 100 : 0, hasOverdueInvoice: hasOverdue, projectStatus: project.status }),
    monthly,
    payments,
    dues,
    expenses,
    activity: (activityRows ?? []) as ProjectAccountActivity[],
  };
}
