import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/app/lib/supabase/session";
import { isInternalAdmin } from "@/app/lib/permissions";
import { getMonthlyReport, getAnnualReport } from "@/app/lib/finance-reports";
import MonthlyReport from "@/app/components/finance/reports/MonthlyReport";
import AnnualReport from "@/app/components/finance/reports/AnnualReport";
import Icon from "@/app/components/ui/Icon";
import type { Company } from "@/app/lib/types";

export const dynamic = "force-dynamic";

export default async function FinanceReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; year?: string; month?: string }>;
}) {
  const { type, year: yearParam, month: monthParam } = await searchParams;
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (!isInternalAdmin(session.profile.role)) redirect("/accounts");
  const companyId = session.company!.id;
  const company = session.company!;

  const now = new Date();
  const reportType: "monthly" | "annual" = type === "annual" ? "annual" : "monthly";
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const month = monthParam ? Number(monthParam) : now.getMonth() + 1;

  const prevMonthRef = new Date(year, month - 2, 1);
  const nextMonthRef = new Date(year, month, 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            التقارير المالية
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>تقارير شهرية وسنوية مبنية على بيانات الشركة الفعلية</p>
        </div>

        <div style={{ display: "flex", gap: 8 }} className="no-print">
          <Link href="/accounts/reports?type=monthly" className={reportType === "monthly" ? "btn btn-gold" : "btn btn-outline"}>
            شهري
          </Link>
          <Link href={`/accounts/reports?type=annual&year=${year}`} className={reportType === "annual" ? "btn btn-gold" : "btn btn-outline"}>
            سنوي
          </Link>
        </div>
      </div>

      {reportType === "monthly" ? (
        <>
          <div className="no-print" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
            <Link
              href={`/accounts/reports?type=monthly&year=${prevMonthRef.getFullYear()}&month=${prevMonthRef.getMonth() + 1}`}
              className="btn-ghost"
              style={{ padding: 8, borderRadius: 8 }}
            >
              <Icon name="chevronRight" size={16} />
            </Link>
            <span style={{ fontSize: 13, fontWeight: 700, minWidth: 120, textAlign: "center" }}>
              {year} / {month}
            </span>
            <Link
              href={`/accounts/reports?type=monthly&year=${nextMonthRef.getFullYear()}&month=${nextMonthRef.getMonth() + 1}`}
              className="btn-ghost"
              style={{ padding: 8, borderRadius: 8 }}
            >
              <Icon name="chevronLeft" size={16} />
            </Link>
          </div>
          <MonthlyReportSection companyId={companyId} year={year} month={month} company={company} />
        </>
      ) : (
        <>
          <div className="no-print" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14 }}>
            <Link href={`/accounts/reports?type=annual&year=${year - 1}`} className="btn-ghost" style={{ padding: 8, borderRadius: 8 }}>
              <Icon name="chevronRight" size={16} />
            </Link>
            <span style={{ fontSize: 13, fontWeight: 700, minWidth: 60, textAlign: "center" }}>{year}</span>
            <Link href={`/accounts/reports?type=annual&year=${year + 1}`} className="btn-ghost" style={{ padding: 8, borderRadius: 8 }}>
              <Icon name="chevronLeft" size={16} />
            </Link>
          </div>
          <AnnualReportSection companyId={companyId} year={year} company={company} />
        </>
      )}
    </div>
  );
}

async function MonthlyReportSection({ companyId, year, month, company }: { companyId: string; year: number; month: number; company: Company }) {
  const report = await getMonthlyReport(companyId, year, month);
  return <MonthlyReport report={report} company={company} />;
}

async function AnnualReportSection({ companyId, year, company }: { companyId: string; year: number; company: Company }) {
  const report = await getAnnualReport(companyId, year);
  return <AnnualReport report={report} company={company} />;
}
