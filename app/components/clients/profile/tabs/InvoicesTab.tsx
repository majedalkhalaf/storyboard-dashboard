"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { INVOICE_STATUSES } from "@/app/lib/constants";
import { fetchClientInvoices } from "@/app/lib/client-profile";
import type { Invoice } from "@/app/lib/types";
import { formatDate } from "@/app/components/projects/utils";

export default function InvoicesTab({ clientId }: { clientId: string }) {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);

  useEffect(() => {
    fetchClientInvoices(clientId).then(setInvoices);
  }, [clientId]);

  if (invoices === null) {
    return <div className="skeleton" style={{ height: 220, borderRadius: 14 }} />;
  }

  if (invoices.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="invoices" size={32} className="text-muted" />
        <p style={{ marginTop: 12 }}>لا توجد فواتير لهذا العميل بعد</p>
      </div>
    );
  }

  const totalInvoiced = invoices.reduce((s, inv) => s + Number(inv.amount ?? 0) + Number(inv.tax ?? 0), 0);
  const paidCount = invoices.filter((inv) => inv.status === "paid").length;
  const unpaidCount = invoices.filter((inv) => inv.status === "unpaid" || inv.status === "overdue").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16, flex: 1 }}>
          <Fin label="إجمالي الفواتير" value={`${totalInvoiced.toLocaleString()} ر.س`} color="#06B6D4" />
          <Fin label="عدد الفواتير" value={invoices.length} color="var(--text-primary)" />
          <Fin label="مدفوعة" value={paidCount} color="#1DB954" />
          <Fin label="غير مدفوعة / متأخرة" value={unpaidCount} color="#EF4444" />
        </div>
        <Link href="/invoices" className="btn-ghost" style={{ fontSize: 12, color: "var(--gold)", whiteSpace: "nowrap" }}>
          عرض الفواتير الكاملة
        </Link>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-scroll" style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>تاريخ الإصدار</th>
                <th>تاريخ الاستحقاق</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const status = INVOICE_STATUSES.find((s) => s.value === inv.status);
                return (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 700 }}>{inv.number}</td>
                    <td>{formatDate(inv.issue_date)}</td>
                    <td>{formatDate(inv.due_date)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {Number(inv.amount ?? 0).toLocaleString()} ر.س
                      {inv.tax ? (
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}> (+{Number(inv.tax).toLocaleString()} ضريبة)</span>
                      ) : null}
                    </td>
                    <td>
                      {status && (
                        <span className="chip" style={{ color: status.color, borderColor: status.color }}>
                          {status.label}
                        </span>
                      )}
                    </td>
                    <td>
                      {inv.pdf_url ? (
                        <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} title="عرض PDF">
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
