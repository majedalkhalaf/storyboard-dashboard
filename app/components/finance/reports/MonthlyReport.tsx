import DocumentHeader, { printResetCss } from "@/app/components/finance/DocumentHeader";
import ReportExportButtons from "@/app/components/finance/reports/ReportExportButtons";
import RevenueExpenseChart from "@/app/components/dashboard/RevenueExpenseChart";
import Icon from "@/app/components/ui/Icon";
import { fmtMoney, fmtDate } from "@/app/components/finance/format";
import { pctChange } from "@/app/lib/finance-dashboard";
import type { MonthlyReportData } from "@/app/lib/finance-reports";
import type { Company } from "@/app/lib/types";

function ChangeBadge({ current, previous }: { current: number; previous: number }) {
  const change = pctChange(current, previous);
  if (change == null) return <span style={{ color: "#666", fontSize: 12 }}>—</span>;
  const positive = change >= 0;
  return (
    <span style={{ color: positive ? "#1DB954" : "#EF4444", fontSize: 12, fontWeight: 700 }}>
      {positive ? "▲" : "▼"} {Math.abs(Math.round(change))}%
    </span>
  );
}

export default function MonthlyReport({ report, company }: { report: MonthlyReportData; company: Company }) {
  const { summary } = report;

  return (
    <>
      <style>{printResetCss}</style>
      <ReportExportButtons report={report} filenameBase={`تقرير_مالي_${report.monthLabel}_${report.year}`} />

      <div className="doc-page">
        <DocumentHeader company={company} title="التقرير المالي الشهري" subtitle={`${report.monthLabel} ${report.year}`} />

        <div className="doc-section">
          <div className="doc-section-title">الملخص المالي</div>
          <table className="doc-table">
            <thead>
              <tr>
                <th style={{ textAlign: "right" }}>البند</th>
                <th style={{ textAlign: "left" }}>القيمة</th>
                <th style={{ textAlign: "left" }}>مقارنة بالشهر الماضي</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>الإيرادات</td>
                <td style={{ textAlign: "left" }}>{fmtMoney(summary.revenue)}</td>
                <td style={{ textAlign: "left" }}>
                  <ChangeBadge current={summary.revenue} previous={summary.revenuePrev} />
                </td>
              </tr>
              <tr>
                <td>المصروفات</td>
                <td style={{ textAlign: "left" }}>{fmtMoney(summary.expenses)}</td>
                <td style={{ textAlign: "left" }}>
                  <ChangeBadge current={summary.expenses} previous={summary.expensesPrev} />
                </td>
              </tr>
              <tr>
                <td>صافي الربح</td>
                <td style={{ textAlign: "left", fontWeight: 800, color: summary.profit >= 0 ? "#1DB954" : "#EF4444" }}>{fmtMoney(summary.profit)}</td>
                <td style={{ textAlign: "left" }}>
                  <ChangeBadge current={summary.profit} previous={summary.profitPrev} />
                </td>
              </tr>
              <tr>
                <td>إجمالي الفواتير الصادرة</td>
                <td style={{ textAlign: "left" }}>{fmtMoney(summary.invoicedTotal)}</td>
                <td style={{ textAlign: "left" }}>—</td>
              </tr>
              <tr>
                <td>نسبة التحصيل</td>
                <td style={{ textAlign: "left" }}>{Math.round(summary.collectionRate)}%</td>
                <td style={{ textAlign: "left" }}>—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="doc-section">
          <div className="doc-section-title">التدفق النقدي داخل الشهر</div>
          <RevenueExpenseChart points={report.cashFlow} />
        </div>

        <div className="doc-section">
          <div className="doc-section-title">أداء المشاريع خلال الشهر</div>
          {report.projectPerformance.length === 0 ? (
            <p className="doc-muted">لا توجد حركة مالية على أي مشروع هذا الشهر</p>
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
                  {report.projectPerformance.map((p) => (
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
          <div className="doc-section-title">الفواتير ({report.invoices.length})</div>
          {report.invoices.length === 0 ? (
            <p className="doc-muted">لا توجد فواتير هذا الشهر</p>
          ) : (
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "right" }}>الرقم</th>
                  <th style={{ textAlign: "right" }}>المشروع</th>
                  <th style={{ textAlign: "right" }}>العميل</th>
                  <th style={{ textAlign: "left" }}>المبلغ</th>
                  <th style={{ textAlign: "left" }}>الحالة</th>
                  <th style={{ textAlign: "left" }}>تاريخ الإصدار</th>
                </tr>
              </thead>
              <tbody>
                {report.invoices.map((i) => (
                  <tr key={i.number}>
                    <td>{i.number}</td>
                    <td>{i.projectName}</td>
                    <td>{i.clientName ?? "—"}</td>
                    <td style={{ textAlign: "left" }}>{fmtMoney(i.amount)}</td>
                    <td style={{ textAlign: "left" }}>{i.status}</td>
                    <td style={{ textAlign: "left" }}>{fmtDate(i.issueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="doc-section">
          <div className="doc-section-title">الدفعات ({report.payments.length})</div>
          {report.payments.length === 0 ? (
            <p className="doc-muted">لا توجد دفعات هذا الشهر</p>
          ) : (
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "right" }}>المشروع</th>
                  <th style={{ textAlign: "left" }}>المبلغ</th>
                  <th style={{ textAlign: "left" }}>الحالة</th>
                  <th style={{ textAlign: "left" }}>الاستحقاق</th>
                  <th style={{ textAlign: "left" }}>السداد</th>
                </tr>
              </thead>
              <tbody>
                {report.payments.map((p, idx) => (
                  <tr key={idx}>
                    <td>{p.projectName}</td>
                    <td style={{ textAlign: "left" }}>{fmtMoney(p.amount)}</td>
                    <td style={{ textAlign: "left" }}>{p.status}</td>
                    <td style={{ textAlign: "left" }}>{fmtDate(p.dueDate)}</td>
                    <td style={{ textAlign: "left" }}>{fmtDate(p.paidDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="doc-section">
          <div className="doc-section-title">المستحقات ({report.dues.length}) — إجمالي {fmtMoney(report.duesTotal)}</div>
          {report.dues.length === 0 ? (
            <p className="doc-muted">لا توجد مستحقات معلّقة بحلول نهاية الشهر</p>
          ) : (
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "right" }}>النوع</th>
                  <th style={{ textAlign: "right" }}>المشروع</th>
                  <th style={{ textAlign: "right" }}>العميل</th>
                  <th style={{ textAlign: "left" }}>المبلغ</th>
                  <th style={{ textAlign: "left" }}>تاريخ الاستحقاق</th>
                </tr>
              </thead>
              <tbody>
                {report.dues.map((d, idx) => (
                  <tr key={idx}>
                    <td>{d.kind === "invoice" ? "فاتورة" : "دفعة"}</td>
                    <td>{d.projectName}</td>
                    <td>{d.clientName ?? "—"}</td>
                    <td style={{ textAlign: "left" }}>{fmtMoney(d.amount)}</td>
                    <td style={{ textAlign: "left" }}>{fmtDate(d.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="doc-notes">
          <div className="doc-label">التوصيات</div>
          <ul style={{ margin: 0, paddingInlineStart: 18 }}>
            {report.recommendations.map((r, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
