"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import Tabs, { type TabDef } from "@/app/components/ui/Tabs";
import ActivityTimeline from "@/app/components/projects/ActivityTimeline";
import RevenueExpenseChart from "@/app/components/dashboard/RevenueExpenseChart";
import FinanceKpiCard from "@/app/components/finance/FinanceKpiCard";
import { fmtMoney, fmtDate } from "@/app/components/finance/format";
import { PAYMENT_METHODS, PAYMENT_STATUSES, PROJECT_STATUSES } from "@/app/lib/constants";
import { FINANCIAL_HEALTH_META } from "@/app/lib/chart-colors";
import AddProjectPaymentButton from "@/app/components/finance/accounts/AddProjectPaymentButton";
import EditProjectPaymentButton from "@/app/components/finance/accounts/EditProjectPaymentButton";
import AddProjectExpenseButton from "@/app/components/finance/accounts/AddProjectExpenseButton";
import type { ProjectAccountData } from "@/app/lib/project-account";

type TabKey = "summary" | "payments" | "expenses" | "dues" | "reports" | "activity";

const TABS: TabDef<TabKey>[] = [
  { key: "summary", label: "الملخص المالي", icon: "barChart" },
  { key: "payments", label: "الدفعات (الإيرادات)", icon: "trendUp" },
  { key: "expenses", label: "المصروفات", icon: "expenses" },
  { key: "dues", label: "المستحقات", icon: "clock" },
  { key: "reports", label: "التقارير", icon: "export" },
  { key: "activity", label: "سجل العمليات", icon: "clock" },
];

export default function AccountDetailClient({ data, companyId, vendors }: { data: ProjectAccountData; companyId: string; vendors: { id: string; name: string }[] }) {
  const [tab, setTab] = useState<TabKey>("summary");
  const status = PROJECT_STATUSES.find((s) => s.value === data.project.status);
  const health = FINANCIAL_HEALTH_META[data.health];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800 }}>
              حساب مشروع: {data.project.name}
            </h1>
            {status && (
              <span className="chip" style={{ color: status.color, borderColor: status.color, fontSize: 11 }}>
                {status.label}
              </span>
            )}
            <span className="chip" style={{ color: health.color, borderColor: health.color, fontSize: 11 }}>
              {health.label}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {data.project.code ?? "—"} · {data.project.clientName ?? "بدون عميل"}
          </p>
        </div>
      </div>

      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <FinanceKpiCard icon="barChart" label="قيمة المشروع" value={fmtMoney(data.contractValue)} color="var(--gold)" />
        <FinanceKpiCard icon="trendUp" label="إجمالي المدفوع" value={fmtMoney(data.paidFromPayments)} color="#1DB954" />
        <FinanceKpiCard icon="clock" label="المتبقي" value={fmtMoney(data.remainingFromBudget)} color="#F59E0B" />
        <FinanceKpiCard icon="expenses" label="إجمالي المصروفات" value={fmtMoney(data.totalExpenses)} color="#EF4444" />
        <FinanceKpiCard icon="money" label="صافي الأرباح" value={fmtMoney(data.profitFromBudget)} color={data.profitFromBudget >= 0 ? "#1DB954" : "#EF4444"} />
        <FinanceKpiCard icon="checkCircle" label="نسبة الربحية" value={`${Math.round(data.profitabilityRate)}%`} color="#3987e5" />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "summary" && (
        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>الإيرادات والمصروفات (آخر 6 أشهر)</h2>
          <RevenueExpenseChart points={data.monthly} />
        </div>
      )}

      {tab === "payments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <AddProjectPaymentButton companyId={companyId} projectId={data.project.id} />
          </div>
          <PaymentsTable payments={data.payments} companyId={companyId} projectId={data.project.id} />
        </div>
      )}

      {tab === "expenses" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <AddProjectExpenseButton companyId={companyId} projectId={data.project.id} vendors={vendors} />
          </div>
          <ExpensesTable expenses={data.expenses} />
        </div>
      )}

      {tab === "dues" && <DuesTable dues={data.dues} />}

      {tab === "reports" && <ReportTab data={data} />}

      {tab === "activity" && (
        <div className="card" style={{ padding: 18 }}>
          {data.activity.length === 0 ? (
            <div className="empty-state">
              <Icon name="clock" size={28} className="text-muted" />
              <p style={{ marginTop: 10 }}>لا توجد عمليات مسجّلة على هذا الحساب بعد</p>
            </div>
          ) : (
            <ActivityTimeline items={data.activity} />
          )}
        </div>
      )}
    </div>
  );
}

function PaymentsTable({ payments, companyId, projectId }: { payments: ProjectAccountData["payments"]; companyId: string; projectId: string }) {
  if (payments.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="trendUp" size={28} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا توجد دفعات مسجّلة لهذا المشروع بعد</p>
      </div>
    );
  }
  return (
    <div className="card table-scroll" style={{ overflow: "hidden" }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>المبلغ</th>
            <th>طريقة الدفع</th>
            <th>رقم المرجع</th>
            <th>تاريخ الاستحقاق</th>
            <th>تاريخ الدفع</th>
            <th>الحالة</th>
            <th>مرفق</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => {
            const status = PAYMENT_STATUSES.find((s) => s.value === p.status);
            const method = PAYMENT_METHODS.find((m) => m.value === p.method);
            return (
              <tr key={p.id}>
                <td style={{ fontWeight: 700 }}>{fmtMoney(p.amount)}</td>
                <td>{method?.label ?? p.method ?? "—"}</td>
                <td style={{ color: "var(--text-muted)" }}>{p.reference_number ?? p.invoice_number ?? "—"}</td>
                <td>{fmtDate(p.due_date)}</td>
                <td>{fmtDate(p.paid_date)}</td>
                <td>
                  {status && (
                    <span className="chip" style={{ color: status.color, borderColor: status.color, fontSize: 11 }}>
                      {status.label}
                    </span>
                  )}
                </td>
                <td>
                  {p.receipt_url ? (
                    <a href={p.receipt_url} target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} title="عرض المرفق">
                      <Icon name="eye" size={14} />
                    </a>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                  )}
                </td>
                <td>
                  <EditProjectPaymentButton companyId={companyId} projectId={projectId} payment={p} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ExpensesTable({ expenses }: { expenses: ProjectAccountData["expenses"] }) {
  if (expenses.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="expenses" size={28} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا توجد مصروفات مسجّلة لهذا المشروع بعد</p>
      </div>
    );
  }
  return (
    <div className="card table-scroll" style={{ overflow: "hidden" }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>نوع المصروف</th>
            <th>المبلغ</th>
            <th>طريقة الدفع</th>
            <th>المورد</th>
            <th>التاريخ</th>
            <th>مرفق</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => {
            const method = PAYMENT_METHODS.find((m) => m.value === e.payment_method);
            return (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.title}</td>
                <td style={{ color: "#EF4444", fontWeight: 700 }}>{fmtMoney(e.amount)}</td>
                <td>{method?.label ?? e.payment_method ?? "—"}</td>
                <td style={{ color: "var(--text-muted)" }}>{e.vendor_name ?? "—"}</td>
                <td>{fmtDate(e.expense_date)}</td>
                <td>
                  {e.attachment_url ? (
                    <a href={e.attachment_url} target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} title="عرض المرفق">
                      <Icon name="eye" size={14} />
                    </a>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DuesTable({ dues }: { dues: ProjectAccountData["payments"] }) {
  const total = dues.reduce((s, d) => s + d.amount, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="stat-card" style={{ maxWidth: 260 }}>
        <span style={{ color: "#F59E0B", display: "inline-flex" }}>
          <Icon name="clock" size={20} />
        </span>
        <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10, color: "#F59E0B" }}>{fmtMoney(total)}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>إجمالي مستحقات هذا المشروع</div>
      </div>

      {dues.length === 0 ? (
        <div className="empty-state card">
          <Icon name="checkCircle" size={28} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد مستحقات غير محصّلة لهذا المشروع</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>المبلغ</th>
                <th>تاريخ الاستحقاق</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {dues.map((d) => {
                const status = PAYMENT_STATUSES.find((s) => s.value === d.status);
                return (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700 }}>{fmtMoney(d.amount)}</td>
                    <td>{fmtDate(d.due_date)}</td>
                    <td>
                      {status && (
                        <span className="chip" style={{ color: status.color, borderColor: status.color, fontSize: 11 }}>
                          {status.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
        ملاحظة: لا يوجد زر «إرسال تنبيه» هنا — لا توجد قناة إشعار فعلية للعميل (بريد/واتساب) مربوطة تلقائياً بالمستحقات في النظام حالياً؛
        إضافة زر كهذا بلا وظيفة فعلية خلفه تُعتبر ميزة وهمية.
      </p>
    </div>
  );
}

function ReportTab({ data }: { data: ProjectAccountData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>تقرير المشروع — ملخص</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <ReportStat label="قيمة المشروع" value={fmtMoney(data.contractValue)} />
          <ReportStat label="إجمالي المدفوع" value={fmtMoney(data.paidFromPayments)} color="#1DB954" />
          <ReportStat label="إجمالي المصروفات" value={fmtMoney(data.totalExpenses)} color="#EF4444" />
          <ReportStat label="صافي الأرباح" value={fmtMoney(data.profitFromBudget)} color={data.profitFromBudget >= 0 ? "#1DB954" : "#EF4444"} />
        </div>
      </div>

      <div className="card table-scroll" style={{ overflow: "hidden" }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, padding: "16px 16px 0" }}>الأداء الشهري (آخر 6 أشهر)</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>الشهر</th>
              <th>الإيرادات</th>
              <th>المصروفات</th>
              <th>الصافي</th>
            </tr>
          </thead>
          <tbody>
            {data.monthly.map((m) => (
              <tr key={m.label}>
                <td style={{ fontWeight: 600 }}>{m.label}</td>
                <td style={{ color: "#1DB954" }}>{fmtMoney(m.revenue)}</td>
                <td style={{ color: "#EF4444" }}>{fmtMoney(m.expenses)}</td>
                <td style={{ fontWeight: 700, color: m.revenue - m.expenses >= 0 ? "#10B981" : "#EF4444" }}>{fmtMoney(m.revenue - m.expenses)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
        لتقارير أشمل عبر كل المشاريع (شهرية/سنوية مع تصدير PDF وExcel)، انتقل إلى{" "}
        <Link href="/accounts/reports" style={{ color: "var(--gold)" }}>
          صفحة التقارير
        </Link>
        .
      </p>
    </div>
  );
}

function ReportStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: color ?? "var(--text-primary)" }}>{value}</div>
    </div>
  );
}
