"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { PAYMENT_STATUSES, PAYMENT_METHODS } from "@/app/lib/constants";
import { fetchClientPayments, type PaymentWithProject } from "@/app/lib/client-profile";
import { formatDate } from "@/app/components/projects/utils";

export default function PaymentsTab({ clientId }: { clientId: string }) {
  const [payments, setPayments] = useState<PaymentWithProject[] | null>(null);

  useEffect(() => {
    fetchClientPayments(clientId).then(setPayments);
  }, [clientId]);

  if (payments === null) {
    return <div className="skeleton" style={{ height: 220, borderRadius: 14 }} />;
  }

  if (payments.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="payments" size={32} className="text-muted" />
        <p style={{ marginTop: 12 }}>لا توجد دفعات لهذا العميل بعد</p>
      </div>
    );
  }

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const totalPending = payments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
          <Fin label="إجمالي المدفوع" value={`${totalPaid.toLocaleString()} ر.س`} color="#1DB954" />
          <Fin label="معلّق / متأخر" value={`${totalPending.toLocaleString()} ر.س`} color="#F59E0B" />
          <Fin label="عدد الدفعات" value={payments.length} color="var(--text-primary)" />
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-scroll" style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ minWidth: 860 }}>
            <thead>
              <tr>
                <th>المشروع</th>
                <th>المبلغ</th>
                <th>طريقة الدفع</th>
                <th>تاريخ الاستحقاق</th>
                <th>تاريخ الدفع</th>
                <th>الحالة</th>
                <th>الإيصال</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const status = PAYMENT_STATUSES.find((s) => s.value === p.status);
                const method = PAYMENT_METHODS.find((m) => m.value === p.method);
                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.project_name}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{Number(p.amount ?? 0).toLocaleString()} ر.س</td>
                    <td>{method?.label ?? p.method ?? "—"}</td>
                    <td>{formatDate(p.due_date)}</td>
                    <td>{formatDate(p.paid_date)}</td>
                    <td>
                      {status && (
                        <span className="chip" style={{ color: status.color, borderColor: status.color }}>
                          {status.label}
                        </span>
                      )}
                    </td>
                    <td>
                      {p.receipt_url ? (
                        <a href={p.receipt_url} target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} title="عرض الإيصال">
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
      </div>
    </div>
  );
}

function Fin({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}
