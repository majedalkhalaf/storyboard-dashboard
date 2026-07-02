"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";
import { INVOICE_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS } from "@/app/lib/constants";
import { fmtMoney, fmtDate, todayIso } from "@/app/components/finance/format";
import Icon from "@/app/components/ui/Icon";
import type { Invoice, Payment, InvoiceStatus } from "@/app/lib/types";

type InvoiceWithRels = Invoice & {
  projects: { name: string } | null;
  clients: { name: string; email: string | null; phone: string | null } | null;
};

export default function InvoiceDetail({
  companyId,
  invoice,
  initialPayments,
}: {
  companyId: string;
  invoice: InvoiceWithRels;
  initialPayments: Payment[];
}) {
  const { profile } = useSession();
  const router = useRouter();
  const admin = isInternalAdmin(profile.role);

  const [amount, setAmount] = useState(String(invoice.amount ?? ""));
  const [tax, setTax] = useState(String(invoice.tax ?? 0));
  const [dueDate, setDueDate] = useState(invoice.due_date ?? "");
  const [status, setStatus] = useState<InvoiceStatus>(invoice.status);
  const [notes, setNotes] = useState(invoice.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // نموذج تسجيل دفعة
  const [payOpen, setPayOpen] = useState(false);
  const [paySaving, setPaySaving] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState(PAYMENT_METHODS[0].value);
  const [payDate, setPayDate] = useState(todayIso());
  const [payError, setPayError] = useState<string | null>(null);

  const total = Number(invoice.amount) + Number(invoice.tax ?? 0);
  const paidSum = initialPayments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);

  const saveInvoice = async () => {
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("invoices")
      .update({
        amount: Number(amount),
        tax: tax ? Number(tax) : 0,
        due_date: dueDate || null,
        status,
        notes: notes.trim() || null,
      })
      .eq("id", invoice.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSavedMsg("تم حفظ التعديلات");
    router.refresh();
  };

  const recordPayment = async () => {
    if (!payAmount) {
      setPayError("المبلغ مطلوب");
      return;
    }
    setPaySaving(true);
    setPayError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("payments").insert({
      company_id: companyId,
      invoice_id: invoice.id,
      project_id: invoice.project_id,
      amount: Number(payAmount),
      due_date: invoice.due_date,
      paid_date: payDate,
      status: "paid",
      method: payMethod,
    });
    setPaySaving(false);
    if (err) {
      setPayError(err.message);
      return;
    }
    setPayOpen(false);
    setPayAmount("");
    setPayMethod(PAYMENT_METHODS[0].value);
    setPayDate(todayIso());
    router.refresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <Link href="/invoices" style={{ fontSize: 13, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon name="arrowRight" size={14} /> الفواتير
          </Link>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>
            فاتورة {invoice.number}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {invoice.projects?.name ?? "—"} · {invoice.clients?.name ?? "بدون عميل"}
          </p>
        </div>
        <Link href={`/invoices/${invoice.id}/print`} className="btn btn-outline">
          <Icon name="export" size={16} /> تصدير PDF
        </Link>
      </div>

      <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>
        {/* تفاصيل / تعديل */}
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>تفاصيل الفاتورة</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                المبلغ (ر.س)
                <input
                  className="input-field"
                  style={{ marginTop: 6 }}
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={!admin}
                />
              </label>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                الضريبة (ر.س)
                <input
                  className="input-field"
                  style={{ marginTop: 6 }}
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  disabled={!admin}
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                تاريخ الاستحقاق
                <input
                  className="input-field"
                  style={{ marginTop: 6 }}
                  type="date"
                  value={dueDate ?? ""}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={!admin}
                />
              </label>
              <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                الحالة
                <select
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                  disabled={!admin}
                >
                  {INVOICE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              ملاحظات
              <textarea
                className="input-field"
                style={{ marginTop: 6, minHeight: 70, resize: "vertical" }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!admin}
              />
            </label>

            {error && <p style={{ color: "#EF4444", fontSize: 13 }}>{error}</p>}
            {savedMsg && <p style={{ color: "#22C55E", fontSize: 13 }}>{savedMsg}</p>}

            {admin && (
              <button className="btn btn-gold" onClick={saveInvoice} disabled={saving} style={{ alignSelf: "flex-start" }}>
                {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
              </button>
            )}
          </div>
        </div>

        {/* ملخص */}
        <div className="card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>الملخص</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14 }}>
            <Row label="المبلغ" value={fmtMoney(invoice.amount)} />
            <Row label="الضريبة" value={fmtMoney(invoice.tax)} />
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <Row label="الإجمالي" value={fmtMoney(total)} bold />
            </div>
            <Row label="المدفوع" value={fmtMoney(paidSum)} valueColor="#22C55E" />
            <Row label="المتبقي" value={fmtMoney(Math.max(0, total - paidSum))} valueColor="#F59E0B" />
            <div style={{ marginTop: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>تاريخ الإصدار: </span>
              <span style={{ fontSize: 13 }}>{fmtDate(invoice.issue_date)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* الدفعات */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>الدفعات</h2>
          {admin && (
            <button className="btn btn-outline" onClick={() => setPayOpen(true)}>
              <Icon name="plus" size={16} /> تسجيل دفعة
            </button>
          )}
        </div>

        {initialPayments.length === 0 ? (
          <div className="empty-state card">
            <p>لا توجد دفعات مسجّلة</p>
          </div>
        ) : (
          <div className="card table-scroll" style={{ overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المبلغ</th>
                  <th>الطريقة</th>
                  <th>تاريخ الدفع</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {initialPayments.map((p) => {
                  const st = PAYMENT_STATUSES.find((s) => s.value === p.status);
                  const method = PAYMENT_METHODS.find((m) => m.value === p.method);
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{fmtMoney(p.amount)}</td>
                      <td>{method?.label ?? p.method ?? "—"}</td>
                      <td>{fmtDate(p.paid_date)}</td>
                      <td>
                        <span className="chip" style={{ color: st?.color, borderColor: st?.color }}>
                          {st?.label ?? p.status}
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

      {payOpen && (
        <div className="modal-overlay no-print" onClick={() => !paySaving && setPayOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>تسجيل دفعة</h3>
              <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setPayOpen(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                المبلغ (ر.س)
                <input
                  className="input-field"
                  style={{ marginTop: 6 }}
                  type="number"
                  min="0"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </label>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                طريقة الدفع
                <select
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                تاريخ الدفع
                <input
                  className="input-field"
                  style={{ marginTop: 6 }}
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                />
              </label>
              {payError && <p style={{ color: "#EF4444", fontSize: 13 }}>{payError}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button className="btn btn-gold" onClick={recordPayment} disabled={paySaving} style={{ flex: 1 }}>
                  {paySaving ? "جارٍ الحفظ..." : "حفظ الدفعة"}
                </button>
                <button className="btn btn-outline" onClick={() => setPayOpen(false)} disabled={paySaving}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  valueColor,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 600, color: valueColor }}>{value}</span>
    </div>
  );
}
