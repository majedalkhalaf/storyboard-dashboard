import Link from "next/link";
import { getCurrentSession } from "@/app/lib/supabase/session";
import Icon from "@/app/components/ui/Icon";
import { fmtMoney } from "@/app/components/finance/format";
import FinanceKpiCard from "@/app/components/finance/FinanceKpiCard";
import RevenueExpenseChart from "@/app/components/dashboard/RevenueExpenseChart";
import AccountsProjectsTable from "@/app/components/finance/accounts/AccountsProjectsTable";
import { getFinanceDashboardData } from "@/app/lib/finance-dashboard";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const session = await getCurrentSession();
  const companyId = session!.company!.id;
  const data = await getFinanceDashboardData(companyId);
  const { kpis, projects } = data;

  const totalProjectValue = projects.reduce((s, p) => s + p.contractValue, 0);
  const totalRevenue = projects.reduce((s, p) => s + p.paidFromPayments, 0);
  const totalProfit = projects.reduce((s, p) => s + p.profitFromBudget, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            الحسابات
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            كل مشروع حساب مستقل — الرصيد، الإيرادات، المصروفات والأرباح لحظياً
          </p>
        </div>
        <Link href="/accounts/reports" className="btn btn-outline">
          <Icon name="export" size={16} /> التقارير
        </Link>
      </div>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14 }}>
        <FinanceKpiCard icon="projects" label="عدد المشاريع" value={String(kpis.totalProjects)} color="var(--gold)" current={kpis.totalProjects} previous={kpis.totalProjectsPrevMonth} changeLabel="عن الشهر الماضي" />
        <FinanceKpiCard icon="barChart" label="إجمالي قيمة المشاريع" value={fmtMoney(totalProjectValue)} color="var(--gold)" />
        <FinanceKpiCard icon="trendUp" label="إجمالي الإيرادات" value={fmtMoney(totalRevenue)} color="#1DB954" current={kpis.paymentsReceived} previous={kpis.paymentsReceivedPrevMonth} changeLabel="عن الشهر الماضي" />
        <FinanceKpiCard icon="expenses" label="إجمالي المصروفات" value={fmtMoney(kpis.totalExpenses)} color="#EF4444" current={kpis.totalExpenses} previous={kpis.totalExpensesPrevMonth} changeLabel="عن الشهر الماضي" />
        <FinanceKpiCard icon="money" label="إجمالي الأرباح" value={fmtMoney(totalProfit)} color={totalProfit >= 0 ? "#1DB954" : "#EF4444"} />
        <FinanceKpiCard icon="clock" label="إجمالي المستحقات" value={fmtMoney(kpis.paymentsDue)} color="#F59E0B" />
      </div>

      <div className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>الإيرادات والمصروفات (آخر 6 أشهر)</h2>
        <RevenueExpenseChart points={data.cashFlow} />
      </div>

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>حسابات المشاريع</h2>
        <AccountsProjectsTable projects={projects} />
      </div>
    </div>
  );
}
