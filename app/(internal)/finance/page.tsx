import { createClient } from "@/app/lib/supabase/server";
import { getCurrentSession } from "@/app/lib/supabase/session";
import Icon from "@/app/components/ui/Icon";
import { fmtMoney } from "@/app/components/finance/format";
import AddExpenseButton from "@/app/components/finance/AddExpenseButton";
import type { Invoice, Expense } from "@/app/lib/types";

export const dynamic = "force-dynamic";

interface ProjectRow {
  id: string;
  name: string;
}

interface ProjectAgg {
  id: string;
  name: string;
  invoiced: number;
  paid: number;
  expenses: number;
  profit: number;
}

export default async function FinancePage() {
  const session = await getCurrentSession();
  const supabase = await createClient();
  const companyId = session!.company!.id;

  const [{ data: invoices }, { data: expenses }, { data: projects }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, project_id, amount, tax, status")
      .eq("company_id", companyId),
    supabase.from("expenses").select("id, project_id, amount, category").eq("company_id", companyId),
    supabase.from("projects").select("id, name").eq("company_id", companyId).order("name"),
  ]);

  const inv = (invoices ?? []) as Pick<Invoice, "id" | "project_id" | "amount" | "tax" | "status">[];
  const exp = (expenses ?? []) as Pick<Expense, "id" | "project_id" | "amount" | "category">[];
  const projectList = (projects ?? []) as ProjectRow[];

  const invTotal = (i: Pick<Invoice, "amount" | "tax">) => Number(i.amount) + Number(i.tax ?? 0);

  const totalInvoiced = inv.reduce((s, i) => s + invTotal(i), 0);
  // المحصّل = فواتير مدفوعة + دفعات مسجّلة كمدفوعة
  const paidInvoices = inv.filter((i) => i.status === "paid").reduce((s, i) => s + invTotal(i), 0);
  const totalUnpaid = inv
    .filter((i) => i.status === "unpaid" || i.status === "overdue")
    .reduce((s, i) => s + invTotal(i), 0);
  const totalExpenses = exp.reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = paidInvoices - totalExpenses;

  // تجميع حسب المشروع
  const nameById = new Map(projectList.map((p) => [p.id, p.name]));
  const aggMap = new Map<string, ProjectAgg>();
  const ensure = (pid: string): ProjectAgg => {
    let a = aggMap.get(pid);
    if (!a) {
      a = { id: pid, name: nameById.get(pid) ?? "مشروع غير معروف", invoiced: 0, paid: 0, expenses: 0, profit: 0 };
      aggMap.set(pid, a);
    }
    return a;
  };
  for (const i of inv) {
    if (!i.project_id) continue;
    const a = ensure(i.project_id);
    a.invoiced += invTotal(i);
    if (i.status === "paid") a.paid += invTotal(i);
  }
  for (const e of exp) {
    if (!e.project_id) continue;
    ensure(e.project_id).expenses += Number(e.amount);
  }
  for (const a of aggMap.values()) a.profit = a.paid - a.expenses;
  const rows = Array.from(aggMap.values()).sort((x, y) => y.invoiced - x.invoiced);

  const generalExpenses = exp.filter((e) => !e.project_id).reduce((s, e) => s + Number(e.amount), 0);

  const stats = [
    { label: "إجمالي الفواتير", value: fmtMoney(totalInvoiced), icon: "invoices" as const, color: "var(--gold)" },
    { label: "المحصّل", value: fmtMoney(paidInvoices), icon: "checkCircle" as const, color: "#22C55E" },
    { label: "المستحق (غير محصّل)", value: fmtMoney(totalUnpaid), icon: "alert" as const, color: "#F59E0B" },
    { label: "إجمالي المصروفات", value: fmtMoney(totalExpenses), icon: "trendDown" as const, color: "#EF4444" },
    {
      label: "صافي الربح",
      value: fmtMoney(netProfit),
      icon: "trendUp" as const,
      color: netProfit >= 0 ? "#10B981" : "#EF4444",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            المالية
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            نظرة شاملة على الإيرادات والمصروفات والأرباح
          </p>
        </div>
        <AddExpenseButton companyId={companyId} projects={projectList} />
      </div>

      <div
        className="stats-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}
      >
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <span style={{ color: s.color, display: "inline-flex" }}>
              <Icon name={s.icon} size={20} />
            </span>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>الأرباح والخسائر حسب المشروع</h2>
          {generalExpenses > 0 && (
            <span className="chip">مصروفات عامة (بدون مشروع): {fmtMoney(generalExpenses)}</span>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="empty-state card">
            <Icon name="finance" size={32} className="text-muted" />
            <p style={{ marginTop: 10 }}>لا توجد بيانات مالية مرتبطة بمشاريع بعد</p>
          </div>
        ) : (
          <div className="card table-scroll" style={{ overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المشروع</th>
                  <th>مفوتر</th>
                  <th>محصّل</th>
                  <th>مصروفات</th>
                  <th>الربح</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td>{fmtMoney(r.invoiced)}</td>
                    <td style={{ color: "#22C55E" }}>{fmtMoney(r.paid)}</td>
                    <td style={{ color: "#EF4444" }}>{fmtMoney(r.expenses)}</td>
                    <td style={{ color: r.profit >= 0 ? "#10B981" : "#EF4444", fontWeight: 700 }}>
                      {fmtMoney(r.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
          الربح = المحصّل − المصروفات. هذه البيانات داخلية فقط ولا تظهر للعملاء.
        </p>
      </div>
    </div>
  );
}
