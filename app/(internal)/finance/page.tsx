import Link from "next/link";
import { getCurrentSession } from "@/app/lib/supabase/session";
import Icon from "@/app/components/ui/Icon";
import { fmtMoney } from "@/app/components/finance/format";
import { FINANCIAL_HEALTH_META } from "@/app/lib/chart-colors";
import AddExpenseButton from "@/app/components/finance/AddExpenseButton";
import FinanceKpiCard from "@/app/components/finance/FinanceKpiCard";
import DonutChart from "@/app/components/finance/charts/DonutChart";
import RevenueExpenseChart from "@/app/components/dashboard/RevenueExpenseChart";
import { getFinanceDashboardData } from "@/app/lib/finance-dashboard";
import { createClient } from "@/app/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const session = await getCurrentSession();
  const companyId = session!.company!.id;
  const supabase = await createClient();

  const [data, { data: projectOptions }] = await Promise.all([
    getFinanceDashboardData(companyId),
    supabase.from("projects").select("id, name").eq("company_id", companyId).order("name"),
  ]);
  const { kpis } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            لوحة المالية
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            نظرة شاملة ولحظية على الوضع المالي للشركة وكل مشاريعها
          </p>
        </div>
        <Link href="/finance/reports" className="btn btn-outline">
          <Icon name="export" size={16} /> تصدير تقرير
        </Link>
      </div>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
        <FinanceKpiCard icon="projects" label="إجمالي المشاريع" value={String(kpis.totalProjects)} color="var(--gold)" current={kpis.totalProjects} previous={kpis.totalProjectsPrevMonth} changeLabel="عن الشهر الماضي" />
        <FinanceKpiCard icon="contracts" label="إجمالي العقود" value={String(kpis.totalContracts)} color="#3987e5" />
        <FinanceKpiCard icon="invoices" label="إجمالي الفواتير" value={fmtMoney(kpis.totalInvoiced)} color="var(--gold)" current={kpis.totalInvoiced} previous={kpis.totalInvoicedPrevMonth} changeLabel="عن الشهر الماضي" />
        <FinanceKpiCard icon="trendUp" label="إجمالي الإيرادات" value={fmtMoney(kpis.totalRevenue)} color="#1DB954" current={kpis.totalRevenue} previous={kpis.totalRevenuePrevMonth} changeLabel="عن الشهر الماضي" />
        <FinanceKpiCard icon="money" label="الدفعات المستلمة" value={fmtMoney(kpis.paymentsReceived)} color="#1DB954" current={kpis.paymentsReceived} previous={kpis.paymentsReceivedPrevMonth} changeLabel="عن الشهر الماضي" />
        <FinanceKpiCard icon="clock" label="الدفعات المستحقة" value={fmtMoney(kpis.paymentsDue)} color="#F59E0B" />
        <FinanceKpiCard icon="trendDown" label="إجمالي المصروفات" value={fmtMoney(kpis.totalExpenses)} color="#EF4444" current={kpis.totalExpenses} previous={kpis.totalExpensesPrevMonth} changeLabel="عن الشهر الماضي" />
        <FinanceKpiCard icon="barChart" label="صافي الأرباح" value={fmtMoney(kpis.netProfit)} color={kpis.netProfit >= 0 ? "#1DB954" : "#EF4444"} current={kpis.netProfit} previous={kpis.netProfitPrevMonth} changeLabel="عن الشهر الماضي" />
        <FinanceKpiCard icon="checkCircle" label="نسبة التحصيل" value={`${Math.round(kpis.collectionRate)}%`} color="#3987e5" />
        <FinanceKpiCard icon="trendUp" label="مشاريع رابحة" value={String(kpis.profitableProjects)} color="#1DB954" />
        <FinanceKpiCard icon="trendDown" label="مشاريع خاسرة" value={String(kpis.losingProjects)} color="#EF4444" />
        <FinanceKpiCard icon="alert" label="مشاريع متأخرة مالياً" value={String(kpis.overdueProjects)} color="#F59E0B" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }} className="finance-charts-grid">
        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>التدفق النقدي (آخر 6 أشهر)</h2>
          <RevenueExpenseChart points={data.cashFlow} />
        </div>
        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>المصروفات حسب التصنيف</h2>
          <DonutChart slices={data.expenseByCategory} size={150} />
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>الحالة المالية للمشاريع</h2>
        <DonutChart slices={data.projectHealthCounts} size={150} valueFormat="count" />
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>المشاريع المالية</h2>
          <Link href="/finance/projects" className="btn btn-outline" style={{ fontSize: 12, padding: "7px 12px" }}>
            عرض الكل <Icon name="arrowLeft" size={13} />
          </Link>
        </div>

        {data.projects.length === 0 ? (
          <div className="empty-state card">
            <Icon name="finance" size={32} className="text-muted" />
            <p style={{ marginTop: 10 }}>لا توجد بيانات مالية مرتبطة بمشاريع بعد</p>
          </div>
        ) : (
          <div className="card table-scroll" style={{ overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>الكود</th>
                  <th>المشروع</th>
                  <th>العميل</th>
                  <th>مفوتر</th>
                  <th>محصّل</th>
                  <th>المتبقي</th>
                  <th>مصروفات</th>
                  <th>الربح</th>
                  <th>نسبة التحصيل</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {data.projects.slice(0, 10).map((r) => {
                  const health = FINANCIAL_HEALTH_META[r.health];
                  return (
                    <tr key={r.id}>
                      <td style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{r.code ?? "—"}</td>
                      <td style={{ fontWeight: 600 }}>
                        <Link href={`/projects/${r.id}`}>{r.name}</Link>
                      </td>
                      <td style={{ color: "var(--text-muted)" }}>{r.clientName ?? "—"}</td>
                      <td>{fmtMoney(r.invoiced)}</td>
                      <td style={{ color: "#1DB954" }}>{fmtMoney(r.paid)}</td>
                      <td style={{ color: "#F59E0B" }}>{fmtMoney(r.remaining)}</td>
                      <td style={{ color: "#EF4444" }}>{fmtMoney(r.expenses)}</td>
                      <td style={{ color: r.profit >= 0 ? "#10B981" : "#EF4444", fontWeight: 700 }}>{fmtMoney(r.profit)}</td>
                      <td>{Math.round(r.collectionRate)}%</td>
                      <td>
                        <span className="chip" style={{ color: health.color, borderColor: health.color, fontSize: 11 }}>
                          {health.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "var(--text-secondary)" }}>إجراءات سريعة</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <AddExpenseButton companyId={companyId} projects={(projectOptions ?? []) as { id: string; name: string }[]} />
          <Link href="/payments?new=1" className="btn btn-outline">
            <Icon name="money" size={16} /> إضافة دفعة
          </Link>
          <Link href="/invoices" className="btn btn-outline">
            <Icon name="invoices" size={16} /> إنشاء فاتورة
          </Link>
          <Link href="/finance/reports?type=monthly" className="btn btn-outline">
            <Icon name="calendar" size={16} /> تقرير شهري
          </Link>
          <Link href="/finance/reports?type=annual" className="btn btn-outline">
            <Icon name="barChart" size={16} /> تقرير سنوي
          </Link>
        </div>
      </div>
    </div>
  );
}
