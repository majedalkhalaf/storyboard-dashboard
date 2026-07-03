import DocumentHeader, { printResetCss } from "@/app/components/finance/DocumentHeader";
import ReportExportButtons from "@/app/components/finance/reports/ReportExportButtons";
import RevenueExpenseChart from "@/app/components/dashboard/RevenueExpenseChart";
import MiniBarChart from "@/app/components/finance/charts/MiniBarChart";
import Icon from "@/app/components/ui/Icon";
import { fmtMoney } from "@/app/components/finance/format";
import type { AnnualReportData } from "@/app/lib/finance-reports";
import type { Company } from "@/app/lib/types";

export default function AnnualReport({ report, company }: { report: AnnualReportData; company: Company }) {
  const { totals, yoy } = report;

  return (
    <>
      <style>{printResetCss}</style>
      <ReportExportButtons report={report} filenameBase={`تقرير_مالي_سنوي_${report.year}`} />

      <div className="doc-page">
        <DocumentHeader company={company} title="التقرير المالي السنوي" subtitle={String(report.year)} />

        <div className="doc-section">
          <div className="doc-section-title">الملخص التنفيذي</div>
          <p style={{ fontSize: 14, lineHeight: 1.8 }}>{report.executiveSummary}</p>
        </div>

        <div className="doc-section">
          <div className="doc-section-title">مؤشرات الأداء الرئيسية</div>
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ textAlign: "right" }}>البند</th>
                <th style={{ textAlign: "left" }}>القيمة</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>إجمالي الإيرادات</td>
                <td style={{ textAlign: "left" }}>{fmtMoney(totals.revenue)}</td>
              </tr>
              <tr>
                <td>إجمالي المصروفات</td>
                <td style={{ textAlign: "left" }}>{fmtMoney(totals.expenses)}</td>
              </tr>
              <tr>
                <td>صافي الربح</td>
                <td style={{ textAlign: "left", fontWeight: 800, color: totals.profit >= 0 ? "#1a7a3e" : "#c0392b" }}>{fmtMoney(totals.profit)}</td>
              </tr>
              <tr>
                <td>عدد العقود الموقّعة هذا العام</td>
                <td style={{ textAlign: "left" }}>{totals.contracts}</td>
              </tr>
              <tr>
                <td>عدد الفواتير الصادرة</td>
                <td style={{ textAlign: "left" }}>{totals.invoices}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="doc-section">
          <div className="doc-section-title">الأداء الشهري (إيرادات ومصروفات)</div>
          <RevenueExpenseChart points={report.monthly} />
        </div>

        <div className="doc-section">
          <div className="doc-section-title">صافي الربح شهرياً</div>
          <MiniBarChart points={report.monthly.map((m) => ({ label: m.label, value: m.profit }))} />
        </div>

        <div className="doc-section">
          <div className="doc-section-title">مقارنة شهر بشهر</div>
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ textAlign: "right" }}>الشهر</th>
                <th style={{ textAlign: "left" }}>الإيرادات</th>
                <th style={{ textAlign: "left" }}>المصروفات</th>
                <th style={{ textAlign: "left" }}>الربح</th>
                <th style={{ textAlign: "left" }}>التغيّر عن الشهر السابق</th>
              </tr>
            </thead>
            <tbody>
              {report.momComparison.map((m) => (
                <tr key={m.label}>
                  <td>{m.label}</td>
                  <td style={{ textAlign: "left" }}>{fmtMoney(m.revenue)}</td>
                  <td style={{ textAlign: "left" }}>{fmtMoney(m.expenses)}</td>
                  <td style={{ textAlign: "left", fontWeight: 700 }}>{fmtMoney(m.profit)}</td>
                  <td style={{ textAlign: "left", color: m.revenueChangePct == null ? "#666" : m.revenueChangePct >= 0 ? "#1a7a3e" : "#c0392b" }}>
                    {m.revenueChangePct == null ? "—" : `${m.revenueChangePct >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(m.revenueChangePct))}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="doc-section">
          <div className="doc-section-title">المقارنة السنوية (مقابل العام السابق)</div>
          {yoy.hasPreviousYear ? (
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "right" }}>البند</th>
                  <th style={{ textAlign: "left" }}>التغيّر مقابل {yoy.previousYear}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>الإيرادات</td>
                  <td style={{ textAlign: "left" }}>{yoy.revenueChangePct == null ? "—" : `${Math.round(yoy.revenueChangePct)}%`}</td>
                </tr>
                <tr>
                  <td>المصروفات</td>
                  <td style={{ textAlign: "left" }}>{yoy.expensesChangePct == null ? "—" : `${Math.round(yoy.expensesChangePct)}%`}</td>
                </tr>
                <tr>
                  <td>صافي الربح</td>
                  <td style={{ textAlign: "left" }}>{yoy.profitChangePct == null ? "—" : `${Math.round(yoy.profitChangePct)}%`}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="doc-muted">لا تتوفر بيانات للسنة السابقة للمقارنة</p>
          )}
        </div>

        <div className="doc-section">
          <div className="doc-section-title">الأداء حسب المشروع</div>
          {report.byProject.length === 0 ? (
            <p className="doc-muted">لا توجد بيانات مشاريع لهذا العام</p>
          ) : (
            <>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "right" }}>المشروع</th>
                    <th style={{ textAlign: "left" }}>الإيرادات</th>
                    <th style={{ textAlign: "left" }}>المصروفات</th>
                    <th style={{ textAlign: "left" }}>الربح</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byProject.map((p) => (
                    <tr key={p.projectId}>
                      <td>{p.projectName}</td>
                      <td style={{ textAlign: "left" }}>{fmtMoney(p.revenue)}</td>
                      <td style={{ textAlign: "left" }}>{fmtMoney(p.expenses)}</td>
                      <td style={{ textAlign: "left", fontWeight: 700, color: p.profit >= 0 ? "#1a7a3e" : "#c0392b" }}>{fmtMoney(p.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: "flex", gap: 24, marginTop: 10, fontSize: 13 }}>
                {report.bestProject && (
                  <span>
                    <Icon name="trendUp" size={14} /> الأفضل: <strong>{report.bestProject.projectName}</strong> ({fmtMoney(report.bestProject.profit)})
                  </span>
                )}
                {report.worstProject && report.worstProject !== report.bestProject && (
                  <span>
                    <Icon name="trendDown" size={14} /> الأضعف: <strong>{report.worstProject.projectName}</strong> ({fmtMoney(report.worstProject.profit)})
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="doc-section">
          <div className="doc-section-title">الأداء حسب العميل</div>
          {report.byClient.length === 0 ? (
            <p className="doc-muted">لا توجد بيانات عملاء لهذا العام</p>
          ) : (
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "right" }}>العميل</th>
                  <th style={{ textAlign: "left" }}>الربح</th>
                </tr>
              </thead>
              <tbody>
                {report.byClient.map((c) => (
                  <tr key={c.clientName}>
                    <td>{c.clientName}</td>
                    <td style={{ textAlign: "left", fontWeight: 700, color: c.profit >= 0 ? "#1a7a3e" : "#c0392b" }}>{fmtMoney(c.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
