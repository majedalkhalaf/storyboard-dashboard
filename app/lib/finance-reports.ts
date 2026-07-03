// وحدة بيانات التقارير المالية (الشهري/السنوي) — نفس نمط finance-dashboard.ts:
// استعلامات مباشرة من Supabase محصورة بالشركة، ثم تجميع وحساب كامل في الخادم.
import { createClient } from "@/app/lib/supabase/server";
import type { Invoice, Payment, Expense, Project } from "@/app/lib/types";
import { pctChange } from "@/app/lib/finance-dashboard";
import { fmtMoney } from "@/app/components/finance/format";

const MONTH_LABELS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export interface ReportDueRow {
  kind: "invoice" | "payment";
  projectName: string;
  clientName: string | null;
  amount: number;
  dueDate: string | null;
}

export interface ReportInvoiceRow {
  number: string;
  projectName: string;
  clientName: string | null;
  amount: number;
  status: string;
  issueDate: string;
}

export interface ReportPaymentRow {
  projectName: string;
  amount: number;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
}

export interface ReportProjectPerf {
  projectId: string;
  projectName: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface MonthlyReportData {
  type: "monthly";
  year: number;
  month: number;
  monthLabel: string;
  summary: {
    revenue: number;
    revenuePrev: number;
    expenses: number;
    expensesPrev: number;
    profit: number;
    profitPrev: number;
    invoicedTotal: number;
    collectionRate: number;
  };
  cashFlow: { label: string; revenue: number; expenses: number }[];
  invoices: ReportInvoiceRow[];
  payments: ReportPaymentRow[];
  dues: ReportDueRow[];
  duesTotal: number;
  projectPerformance: ReportProjectPerf[];
  bestProject: ReportProjectPerf | null;
  worstProject: ReportProjectPerf | null;
  recommendations: string[];
}

export interface AnnualReportData {
  type: "annual";
  year: number;
  totals: { revenue: number; expenses: number; profit: number; contracts: number; invoices: number };
  monthly: { label: string; revenue: number; expenses: number; profit: number }[];
  byProject: ReportProjectPerf[];
  byClient: { clientName: string; profit: number }[];
  bestProject: ReportProjectPerf | null;
  worstProject: ReportProjectPerf | null;
  momComparison: { label: string; revenue: number; expenses: number; profit: number; revenueChangePct: number | null }[];
  yoy:
    | { hasPreviousYear: false }
    | { hasPreviousYear: true; previousYear: number; revenueChangePct: number | null; expensesChangePct: number | null; profitChangePct: number | null };
  executiveSummary: string;
}

interface RawFinanceData {
  projectNameById: Map<string, string>;
  clientNameByProjectId: Map<string, string | null>;
  invoices: Pick<Invoice, "id" | "number" | "project_id" | "client_id" | "amount" | "tax" | "status" | "issue_date" | "due_date">[];
  payments: Pick<Payment, "id" | "project_id" | "amount" | "status" | "due_date" | "paid_date">[];
  expenses: Pick<Expense, "id" | "project_id" | "amount" | "expense_date">[];
  contracts: { id: string; created_at: string }[];
}

async function fetchRawFinanceData(companyId: string): Promise<RawFinanceData> {
  const supabase = await createClient();
  const [{ data: projectRows }, { data: clientRows }, { data: invoiceRows }, { data: paymentRows }, { data: expenseRows }, { data: contractRows }] =
    await Promise.all([
      supabase.from("projects").select("id, name, client_id").eq("company_id", companyId),
      supabase.from("clients").select("id, name").eq("company_id", companyId),
      supabase.from("invoices").select("id, number, project_id, client_id, amount, tax, status, issue_date, due_date").eq("company_id", companyId),
      supabase.from("payments").select("id, project_id, amount, status, due_date, paid_date").eq("company_id", companyId),
      supabase.from("expenses").select("id, project_id, amount, expense_date").eq("company_id", companyId),
      supabase.from("contracts").select("id, created_at").eq("company_id", companyId),
    ]);

  const projects = (projectRows ?? []) as Pick<Project, "id" | "name" | "client_id">[];
  const clientNameById = new Map((clientRows ?? []).map((c) => [c.id as string, c.name as string]));
  const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  const clientNameByProjectId = new Map(projects.map((p) => [p.id, p.client_id ? (clientNameById.get(p.client_id) ?? null) : null]));

  return {
    projectNameById,
    clientNameByProjectId,
    invoices: (invoiceRows ?? []) as RawFinanceData["invoices"],
    payments: (paymentRows ?? []) as RawFinanceData["payments"],
    expenses: (expenseRows ?? []) as RawFinanceData["expenses"],
    contracts: (contractRows ?? []) as RawFinanceData["contracts"],
  };
}

function invTotal(i: { amount: number; tax?: number | null }): number {
  return Number(i.amount) + Number(i.tax ?? 0);
}

function inRange(dateStr: string | null | undefined, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d < end;
}

export async function getMonthlyReport(companyId: string, year: number, month: number): Promise<MonthlyReportData> {
  const raw = await fetchRawFinanceData(companyId);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const prevRef = new Date(year, month - 2, 1);
  const prevStart = new Date(prevRef.getFullYear(), prevRef.getMonth(), 1);
  const prevEnd = new Date(prevRef.getFullYear(), prevRef.getMonth() + 1, 1);

  const invoicesThisMonth = raw.invoices.filter((i) => inRange(i.issue_date, monthStart, monthEnd));
  const revenue = invoicesThisMonth.filter((i) => i.status === "paid").reduce((s, i) => s + invTotal(i), 0);
  const invoicedTotal = invoicesThisMonth.reduce((s, i) => s + invTotal(i), 0);
  const expensesThisMonth = raw.expenses.filter((e) => inRange(e.expense_date, monthStart, monthEnd));
  const expenses = expensesThisMonth.reduce((s, e) => s + Number(e.amount), 0);
  const profit = revenue - expenses;
  const collectionRate = invoicedTotal > 0 ? (revenue / invoicedTotal) * 100 : 0;

  const revenuePrev = raw.invoices
    .filter((i) => i.status === "paid" && inRange(i.issue_date, prevStart, prevEnd))
    .reduce((s, i) => s + invTotal(i), 0);
  const expensesPrev = raw.expenses.filter((e) => inRange(e.expense_date, prevStart, prevEnd)).reduce((s, e) => s + Number(e.amount), 0);
  const profitPrev = revenuePrev - expensesPrev;

  // تدفق نقدي أسبوعي داخل الشهر
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekBuckets: { label: string; start: number; end: number }[] = [];
  let dayCursor = 1;
  let weekIndex = 1;
  while (dayCursor <= daysInMonth) {
    const end = Math.min(dayCursor + 6, daysInMonth);
    weekBuckets.push({ label: `الأسبوع ${weekIndex}`, start: dayCursor, end });
    dayCursor = end + 1;
    weekIndex++;
  }
  const cashFlow = weekBuckets.map((w) => {
    const s = new Date(year, month - 1, w.start);
    const e = new Date(year, month - 1, w.end + 1);
    return {
      label: w.label,
      revenue: raw.invoices.filter((i) => i.status === "paid" && inRange(i.issue_date, s, e)).reduce((sum, i) => sum + invTotal(i), 0),
      expenses: raw.expenses.filter((ex) => inRange(ex.expense_date, s, e)).reduce((sum, ex) => sum + Number(ex.amount), 0),
    };
  });

  const invoices: ReportInvoiceRow[] = invoicesThisMonth
    .map((i) => ({
      number: i.number,
      projectName: (i.project_id && raw.projectNameById.get(i.project_id)) ?? "—",
      clientName: (i.project_id && raw.clientNameByProjectId.get(i.project_id)) ?? null,
      amount: invTotal(i),
      status: i.status,
      issueDate: i.issue_date,
    }))
    .sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));

  const paymentsThisMonth = raw.payments.filter(
    (p) => inRange(p.due_date, monthStart, monthEnd) || inRange(p.paid_date, monthStart, monthEnd)
  );
  const payments: ReportPaymentRow[] = paymentsThisMonth.map((p) => ({
    projectName: (p.project_id && raw.projectNameById.get(p.project_id)) ?? "—",
    amount: Number(p.amount),
    status: p.status,
    dueDate: p.due_date,
    paidDate: p.paid_date,
  }));

  // المستحقات: فواتير/دفعات غير مسددة تستحق بحلول نهاية هذا الشهر
  const duesInvoices: ReportDueRow[] = raw.invoices
    .filter((i) => (i.status === "unpaid" || i.status === "overdue") && i.due_date && new Date(i.due_date) < monthEnd)
    .map((i) => ({
      kind: "invoice" as const,
      projectName: (i.project_id && raw.projectNameById.get(i.project_id)) ?? "—",
      clientName: (i.project_id && raw.clientNameByProjectId.get(i.project_id)) ?? null,
      amount: invTotal(i),
      dueDate: i.due_date,
    }));
  const duesPayments: ReportDueRow[] = raw.payments
    .filter((p) => (p.status === "pending" || p.status === "overdue") && p.due_date && new Date(p.due_date) < monthEnd)
    .map((p) => ({
      kind: "payment" as const,
      projectName: (p.project_id && raw.projectNameById.get(p.project_id)) ?? "—",
      clientName: (p.project_id && raw.clientNameByProjectId.get(p.project_id)) ?? null,
      amount: Number(p.amount),
      dueDate: p.due_date,
    }));
  const dues = [...duesInvoices, ...duesPayments].sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const duesTotal = dues.reduce((s, d) => s + d.amount, 0);

  // أداء المشاريع خلال الشهر
  const projRevenue = new Map<string, number>();
  const projExpense = new Map<string, number>();
  for (const i of invoicesThisMonth) {
    if (i.status === "paid" && i.project_id) projRevenue.set(i.project_id, (projRevenue.get(i.project_id) ?? 0) + invTotal(i));
  }
  for (const e of expensesThisMonth) {
    if (e.project_id) projExpense.set(e.project_id, (projExpense.get(e.project_id) ?? 0) + Number(e.amount));
  }
  const projectIds = new Set([...projRevenue.keys(), ...projExpense.keys()]);
  const projectPerformance: ReportProjectPerf[] = Array.from(projectIds)
    .map((id) => {
      const rev = projRevenue.get(id) ?? 0;
      const exp = projExpense.get(id) ?? 0;
      return { projectId: id, projectName: raw.projectNameById.get(id) ?? "—", revenue: rev, expenses: exp, profit: rev - exp };
    })
    .sort((a, b) => b.profit - a.profit);
  const bestProject = projectPerformance[0] ?? null;
  const worstProject = projectPerformance.length ? projectPerformance[projectPerformance.length - 1] : null;

  const recommendations: string[] = [];
  if (invoicedTotal > 0 && collectionRate < 60) {
    recommendations.push(`نسبة التحصيل هذا الشهر ${Math.round(collectionRate)}%، ننصح بمتابعة الفواتير المتأخرة لتحسين التدفق النقدي.`);
  }
  if (profit < 0) {
    recommendations.push(`سجّل الشهر خسارة صافية قدرها ${fmtMoney(Math.abs(profit))}، يُنصح بمراجعة بنود المصروفات الأعلى قيمة.`);
  }
  const profitChange = pctChange(profit, profitPrev);
  if (profitChange != null && profitChange >= 15) {
    recommendations.push(`ارتفع صافي الربح ${Math.round(profitChange)}% مقارنة بالشهر الماضي، أداء إيجابي يستحق الاستمرار على نفس النهج.`);
  } else if (profitChange != null && profitChange <= -15) {
    recommendations.push(`انخفض صافي الربح ${Math.round(Math.abs(profitChange))}% مقارنة بالشهر الماضي، يستحق التحقق من السبب.`);
  }
  if (duesTotal > 0) {
    recommendations.push(`توجد مستحقات غير محصّلة بقيمة ${fmtMoney(duesTotal)} (${dues.length} بند)، متابعتها ستحسّن السيولة.`);
  }
  if (worstProject && worstProject.profit < 0 && worstProject !== bestProject) {
    recommendations.push(`مشروع "${worstProject.projectName}" يسجّل خسارة ${fmtMoney(Math.abs(worstProject.profit))} هذا الشهر ويستحق المراجعة.`);
  }
  if (recommendations.length === 0) {
    recommendations.push(
      `الأداء المالي لهذا الشهر ضمن المعدل الطبيعي (ربح ${fmtMoney(profit)}، نسبة تحصيل ${Math.round(collectionRate)}%)، لا توجد ملاحظات حرجة حالياً.`
    );
  }

  return {
    type: "monthly",
    year,
    month,
    monthLabel: MONTH_LABELS_AR[month - 1],
    summary: { revenue, revenuePrev, expenses, expensesPrev, profit, profitPrev, invoicedTotal, collectionRate },
    cashFlow,
    invoices,
    payments,
    dues,
    duesTotal,
    projectPerformance,
    bestProject,
    worstProject,
    recommendations: recommendations.slice(0, 4),
  };
}

export async function getAnnualReport(companyId: string, year: number): Promise<AnnualReportData> {
  const raw = await fetchRawFinanceData(companyId);

  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const invoicesYear = raw.invoices.filter((i) => inRange(i.issue_date, yearStart, yearEnd));
  const revenue = invoicesYear.filter((i) => i.status === "paid").reduce((s, i) => s + invTotal(i), 0);
  const expensesYear = raw.expenses.filter((e) => inRange(e.expense_date, yearStart, yearEnd));
  const expenses = expensesYear.reduce((s, e) => s + Number(e.amount), 0);
  const profit = revenue - expenses;
  const contractsYear = raw.contracts.filter((c) => inRange(c.created_at, yearStart, yearEnd)).length;

  const monthly = Array.from({ length: 12 }, (_, m) => {
    const s = new Date(year, m, 1);
    const e = new Date(year, m + 1, 1);
    const rev = raw.invoices.filter((i) => i.status === "paid" && inRange(i.issue_date, s, e)).reduce((sum, i) => sum + invTotal(i), 0);
    const exp = raw.expenses.filter((ex) => inRange(ex.expense_date, s, e)).reduce((sum, ex) => sum + Number(ex.amount), 0);
    return { label: MONTH_LABELS_AR[m], revenue: rev, expenses: exp, profit: rev - exp };
  });

  const projRevenue = new Map<string, number>();
  const projExpense = new Map<string, number>();
  for (const i of invoicesYear) {
    if (i.status === "paid" && i.project_id) projRevenue.set(i.project_id, (projRevenue.get(i.project_id) ?? 0) + invTotal(i));
  }
  for (const e of expensesYear) {
    if (e.project_id) projExpense.set(e.project_id, (projExpense.get(e.project_id) ?? 0) + Number(e.amount));
  }
  const projectIds = new Set([...projRevenue.keys(), ...projExpense.keys()]);
  const byProject: ReportProjectPerf[] = Array.from(projectIds)
    .map((id) => {
      const rev = projRevenue.get(id) ?? 0;
      const exp = projExpense.get(id) ?? 0;
      return { projectId: id, projectName: raw.projectNameById.get(id) ?? "—", revenue: rev, expenses: exp, profit: rev - exp };
    })
    .sort((a, b) => b.profit - a.profit);

  const clientProfit = new Map<string, number>();
  for (const p of byProject) {
    const clientName = raw.clientNameByProjectId.get(p.projectId) ?? "بدون عميل";
    clientProfit.set(clientName ?? "بدون عميل", (clientProfit.get(clientName ?? "بدون عميل") ?? 0) + p.profit);
  }
  const byClient = Array.from(clientProfit.entries())
    .map(([clientName, profit]) => ({ clientName, profit }))
    .sort((a, b) => b.profit - a.profit);

  const bestProject = byProject[0] ?? null;
  const worstProject = byProject.length ? byProject[byProject.length - 1] : null;

  const momComparison = monthly.map((m, i) => ({
    label: m.label,
    revenue: m.revenue,
    expenses: m.expenses,
    profit: m.profit,
    revenueChangePct: i === 0 ? null : pctChange(m.revenue, monthly[i - 1].revenue),
  }));

  const prevYearStart = new Date(year - 1, 0, 1);
  const prevYearEnd = new Date(year, 0, 1);
  const hasPreviousYear =
    raw.invoices.some((i) => inRange(i.issue_date, prevYearStart, prevYearEnd)) || raw.expenses.some((e) => inRange(e.expense_date, prevYearStart, prevYearEnd));

  let yoy: AnnualReportData["yoy"];
  if (hasPreviousYear) {
    const prevRevenue = raw.invoices
      .filter((i) => i.status === "paid" && inRange(i.issue_date, prevYearStart, prevYearEnd))
      .reduce((s, i) => s + invTotal(i), 0);
    const prevExpenses = raw.expenses.filter((e) => inRange(e.expense_date, prevYearStart, prevYearEnd)).reduce((s, e) => s + Number(e.amount), 0);
    const prevProfit = prevRevenue - prevExpenses;
    yoy = {
      hasPreviousYear: true,
      previousYear: year - 1,
      revenueChangePct: pctChange(revenue, prevRevenue),
      expensesChangePct: pctChange(expenses, prevExpenses),
      profitChangePct: pctChange(profit, prevProfit),
    };
  } else {
    yoy = { hasPreviousYear: false };
  }

  const summaryParts: string[] = [];
  summaryParts.push(`حقّقت الشركة خلال عام ${year} إيرادات إجمالية بلغت ${fmtMoney(revenue)} مقابل مصروفات ${fmtMoney(expenses)}، بصافي ربح ${fmtMoney(profit)}.`);
  if (yoy.hasPreviousYear && yoy.profitChangePct != null) {
    summaryParts.push(
      `${yoy.profitChangePct >= 0 ? "ارتفع" : "انخفض"} صافي الربح بنسبة ${Math.round(Math.abs(yoy.profitChangePct))}% مقارنة بعام ${yoy.previousYear}.`
    );
  } else {
    summaryParts.push(`لا تتوفر بيانات للسنة السابقة للمقارنة.`);
  }
  if (bestProject) summaryParts.push(`كان مشروع "${bestProject.projectName}" الأعلى ربحية بقيمة ${fmtMoney(bestProject.profit)}.`);
  if (worstProject && worstProject.profit < 0 && worstProject !== bestProject) {
    summaryParts.push(`فيما سجّل مشروع "${worstProject.projectName}" خسارة قدرها ${fmtMoney(Math.abs(worstProject.profit))} ويستحق المراجعة.`);
  }

  return {
    type: "annual",
    year,
    totals: { revenue, expenses, profit, contracts: contractsYear, invoices: invoicesYear.length },
    monthly,
    byProject,
    byClient,
    bestProject,
    worstProject,
    momComparison,
    yoy,
    executiveSummary: summaryParts.join(" "),
  };
}
