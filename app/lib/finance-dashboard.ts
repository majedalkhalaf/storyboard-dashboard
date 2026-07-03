import { createClient } from "@/app/lib/supabase/server";
import type { Contract, Expense, FinancialCategory, Invoice, Payment, Project } from "@/app/lib/types";
import { computeFinancialHealth, type FinancialHealth } from "@/app/lib/chart-colors";
export { pctChange } from "@/app/lib/pct-change";

export interface FinanceProjectRow {
  id: string;
  code: string | null;
  name: string;
  clientName: string | null;
  status: string;
  contractValue: number;
  invoiced: number;
  paid: number;
  remaining: number;
  expenses: number;
  profit: number;
  collectionRate: number;
  health: FinancialHealth;
  // حقول "حسابات المشاريع" المبسّطة — قيمة المشروع = ميزانية المشروع (لا مجموع
  // الفواتير)، والمدفوع = مجموع دفعات جدول payments الفعلية المرتبطة بالمشروع
  // (لا حالة الفواتير)، لتطابق نموذج "كل مشروع حساب مستقل" المطلوب بدل الاعتماد
  // على الفواتير كخطوة وسيطة إلزامية.
  paidFromPayments: number;
  remainingFromBudget: number;
  profitFromBudget: number;
  profitabilityRate: number;
}

export interface MonthPoint {
  label: string;
  revenue: number;
  expenses: number;
}

export interface FinanceDashboardData {
  kpis: {
    totalProjects: number;
    totalProjectsPrevMonth: number;
    totalContracts: number;
    totalInvoiced: number;
    totalInvoicedPrevMonth: number;
    totalRevenue: number; // فواتير مدفوعة
    totalRevenuePrevMonth: number;
    paymentsReceived: number;
    paymentsReceivedPrevMonth: number;
    paymentsDue: number;
    totalExpenses: number;
    totalExpensesPrevMonth: number;
    netProfit: number;
    netProfitPrevMonth: number;
    collectionRate: number;
    profitableProjects: number;
    losingProjects: number;
    overdueProjects: number;
  };
  cashFlow: MonthPoint[];
  expenseByCategory: { label: string; value: number; color: string }[];
  projectHealthCounts: { label: string; value: number; color: string }[];
  projects: FinanceProjectRow[];
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_LABELS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export async function getFinanceDashboardData(companyId: string): Promise<FinanceDashboardData> {
  const supabase = await createClient();

  const [{ data: projectRows }, { data: clientRows }, { data: invoiceRows }, { data: paymentRows }, { data: expenseRows }, { data: categoryRows }, { data: contractRows }] =
    await Promise.all([
      supabase.from("projects").select("id, code, name, client_id, status, budget, created_at").eq("company_id", companyId),
      supabase.from("clients").select("id, name").eq("company_id", companyId),
      supabase.from("invoices").select("id, project_id, amount, tax, status, issue_date").eq("company_id", companyId),
      supabase.from("payments").select("id, project_id, amount, status, paid_date, due_date").eq("company_id", companyId),
      supabase.from("expenses").select("id, project_id, amount, expense_date, category_id").eq("company_id", companyId),
      supabase.from("financial_categories").select("id, name, color").eq("company_id", companyId).eq("type", "expense"),
      supabase.from("contracts").select("id").eq("company_id", companyId),
    ]);

  const projects = (projectRows ?? []) as Pick<Project, "id" | "code" | "name" | "client_id" | "status" | "budget" | "created_at">[];
  const clientNameById = new Map((clientRows ?? []).map((c) => [c.id as string, c.name as string]));
  const invoices = (invoiceRows ?? []) as Pick<Invoice, "id" | "project_id" | "amount" | "tax" | "status" | "issue_date">[];
  const payments = (paymentRows ?? []) as Pick<Payment, "id" | "project_id" | "amount" | "status" | "paid_date" | "due_date">[];
  const expenses = (expenseRows ?? []) as Pick<Expense, "id" | "project_id" | "amount" | "expense_date" | "category_id">[];
  const categories = (categoryRows ?? []) as Pick<FinancialCategory, "id" | "name" | "color">[];
  const contracts = (contractRows ?? []) as Pick<Contract, "id">[];

  const invTotal = (i: Pick<Invoice, "amount" | "tax">) => Number(i.amount) + Number(i.tax ?? 0);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const inMonth = (dateStr: string | null, start: Date) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getFullYear() === start.getFullYear() && d.getMonth() === start.getMonth();
  };

  const totalInvoiced = invoices.reduce((s, i) => s + invTotal(i), 0);
  const totalInvoicedPrevMonth = invoices.filter((i) => inMonth(i.issue_date, prevMonthStart)).reduce((s, i) => s + invTotal(i), 0);
  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + invTotal(i), 0);
  const totalRevenuePrevMonth = invoices.filter((i) => i.status === "paid" && inMonth(i.issue_date, prevMonthStart)).reduce((s, i) => s + invTotal(i), 0);

  const paymentsReceived = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const paymentsReceivedPrevMonth = payments.filter((p) => p.status === "paid" && inMonth(p.paid_date, prevMonthStart)).reduce((s, p) => s + Number(p.amount), 0);
  const paymentsDue = payments.filter((p) => p.status === "pending" || p.status === "overdue").reduce((s, p) => s + Number(p.amount), 0);

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalExpensesPrevMonth = expenses.filter((e) => inMonth(e.expense_date, prevMonthStart)).reduce((s, e) => s + Number(e.amount), 0);

  const netProfit = totalRevenue - totalExpenses;
  const netProfitPrevMonth = totalRevenuePrevMonth - totalExpensesPrevMonth;

  const collectionRate = totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : 0;

  const totalProjectsPrevMonth = projects.filter((p) => new Date(p.created_at) < thisMonthStart).length;

  // تجميع حسب المشروع
  const invByProject = new Map<string, number>();
  const paidByProject = new Map<string, number>();
  const paidFromPaymentsByProject = new Map<string, number>();
  const expByProject = new Map<string, number>();
  const overdueProjectIds = new Set<string>();
  for (const i of invoices) {
    if (!i.project_id) continue;
    invByProject.set(i.project_id, (invByProject.get(i.project_id) ?? 0) + invTotal(i));
    if (i.status === "paid") paidByProject.set(i.project_id, (paidByProject.get(i.project_id) ?? 0) + invTotal(i));
    if (i.status === "overdue") overdueProjectIds.add(i.project_id);
  }
  for (const p of payments) {
    if (p.status === "overdue" && p.project_id) overdueProjectIds.add(p.project_id);
    if (p.status === "paid" && p.project_id) paidFromPaymentsByProject.set(p.project_id, (paidFromPaymentsByProject.get(p.project_id) ?? 0) + Number(p.amount));
  }
  for (const e of expenses) {
    if (!e.project_id) continue;
    expByProject.set(e.project_id, (expByProject.get(e.project_id) ?? 0) + Number(e.amount));
  }

  const projectRowsOut: FinanceProjectRow[] = projects.map((p) => {
    const invoiced = invByProject.get(p.id) ?? 0;
    const paid = paidByProject.get(p.id) ?? 0;
    const exp = expByProject.get(p.id) ?? 0;
    const profit = paid - exp;
    const rate = invoiced > 0 ? (paid / invoiced) * 100 : 0;
    const budget = Number(p.budget ?? 0);
    const paidFromPayments = paidFromPaymentsByProject.get(p.id) ?? 0;
    const profitFromBudget = paidFromPayments - exp;
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      clientName: p.client_id ? (clientNameById.get(p.client_id) ?? null) : null,
      status: p.status,
      contractValue: budget,
      invoiced,
      paid,
      remaining: invoiced - paid,
      expenses: exp,
      profit,
      collectionRate: rate,
      health: computeFinancialHealth({ collectionRate: rate, hasOverdueInvoice: overdueProjectIds.has(p.id), projectStatus: p.status }),
      paidFromPayments,
      remainingFromBudget: budget - paidFromPayments,
      profitFromBudget,
      profitabilityRate: budget > 0 ? (profitFromBudget / budget) * 100 : 0,
    };
  });

  const profitableProjects = projectRowsOut.filter((p) => p.profit > 0).length;
  const losingProjects = projectRowsOut.filter((p) => p.profit < 0).length;
  const overdueProjects = projectRowsOut.filter((p) => p.health === "overdue").length;

  // تدفق نقدي لآخر 6 أشهر
  const months: { key: string; label: string; date: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: MONTH_LABELS_AR[d.getMonth()], date: d });
  }
  const cashFlow: MonthPoint[] = months.map((m) => ({
    label: m.label,
    revenue: invoices.filter((i) => i.status === "paid" && i.issue_date && monthKey(new Date(i.issue_date)) === m.key).reduce((s, i) => s + invTotal(i), 0),
    expenses: expenses.filter((e) => e.expense_date && monthKey(new Date(e.expense_date)) === m.key).reduce((s, e) => s + Number(e.amount), 0),
  }));

  // مصروفات حسب التصنيف (أعلى 3 تصنيفات + "أخرى" لما تبقى)
  const expenseByCatId = new Map<string, number>();
  let uncategorized = 0;
  for (const e of expenses) {
    if (e.category_id) expenseByCatId.set(e.category_id, (expenseByCatId.get(e.category_id) ?? 0) + Number(e.amount));
    else uncategorized += Number(e.amount);
  }
  const sortedCats = categories
    .map((c) => ({ label: c.name, value: expenseByCatId.get(c.id) ?? 0, color: c.color }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const topCats = sortedCats.slice(0, 3);
  const otherTotal = sortedCats.slice(3).reduce((s, c) => s + c.value, 0) + uncategorized;
  const expenseByCategory = [...topCats, ...(otherTotal > 0 ? [{ label: "أخرى", value: otherTotal, color: "#6B7280" }] : [])];

  const healthCounts: Record<FinancialHealth, number> = { good: 0, watch: 0, overdue: 0, completed: 0 };
  for (const p of projectRowsOut) healthCounts[p.health]++;
  const projectHealthCounts = [
    { label: "جيد", value: healthCounts.good, color: "#1DB954" },
    { label: "مكتمل", value: healthCounts.completed, color: "#3987e5" },
    { label: "تحت المتابعة", value: healthCounts.watch, color: "#F59E0B" },
    { label: "متأخر", value: healthCounts.overdue, color: "#EF4444" },
  ].filter((s) => s.value > 0);

  return {
    kpis: {
      totalProjects: projects.length,
      totalProjectsPrevMonth,
      totalContracts: contracts.length,
      totalInvoiced,
      totalInvoicedPrevMonth,
      totalRevenue,
      totalRevenuePrevMonth,
      paymentsReceived,
      paymentsReceivedPrevMonth,
      paymentsDue,
      totalExpenses,
      totalExpensesPrevMonth,
      netProfit,
      netProfitPrevMonth,
      collectionRate,
      profitableProjects,
      losingProjects,
      overdueProjects,
    },
    cashFlow,
    expenseByCategory,
    projectHealthCounts,
    projects: projectRowsOut.sort((a, b) => b.invoiced - a.invoiced),
  };
}
