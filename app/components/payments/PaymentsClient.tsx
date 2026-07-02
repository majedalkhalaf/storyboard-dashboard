"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { PAYMENT_STATUSES, PAYMENT_METHODS } from "@/app/lib/constants";
import { fmtMoney, fmtDate, todayIso } from "@/app/components/finance/format";
import Icon from "@/app/components/ui/Icon";
import type { PaymentStatus } from "@/app/lib/types";

interface PaymentRow {
  id: string;
  company_id: string;
  invoice_id: string | null;
  project_id: string;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  status: PaymentStatus;
  method: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  project: { name: string } | null;
  invoice: { number: string } | null;
}

interface ProjectRow {
  id: string;
  name: string;
}

interface InvoiceRow {
  id: string;
  number: string;
  amount: number;
  project_id: string;
}

function StatusChip({ status }: { status: PaymentStatus }) {
  const info = PAYMENT_STATUSES.find((s) => s.value === status);
  return (
    <span className="chip" style={{ color: info?.color, borderColor: info?.color }}>
      {info?.label ?? status}
    </span>
  );
}

function methodLabel(method: string | null): string {
  if (!method) return "—";
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

export default function PaymentsClient({
  companyId,
  initialPayments,
  projects,
  invoices,
}: {
  companyId: string;
  initialPayments: PaymentRow[];
  projects: ProjectRow[];
  invoices: InvoiceRow[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [projectFilter, setProjectFilter] = useState("");
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [projectId, setProjectId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [method, setMethod] = useState(PAYMENT_METHODS[0].value);
  const [status, setStatus] = useState<PaymentStatus>("pending");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opens create modal from a deep link query param
    if (searchParams.get("new") === "1") setOpen(true);
  }, [searchParams]);

  const stats = useMemo(() => {
    const totalPending = initialPayments
      .filter((p) => p.status === "pending")
      .reduce((s, p) => s + Number(p.amount), 0);
    const totalPaid = initialPayments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
    const totalOverdue = initialPayments
      .filter((p) => p.status === "overdue")
      .reduce((s, p) => s + Number(p.amount), 0);
    return { totalPending, totalPaid, totalOverdue };
  }, [initialPayments]);

  const filtered = useMemo(() => {
    return initialPayments.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (projectFilter && p.project_id !== projectFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${p.project?.name ?? ""} ${p.invoice?.number ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [initialPayments, statusFilter, projectFilter, search]);

  const invoicesForProject = useMemo(
    () => invoices.filter((i) => i.project_id === projectId),
    [invoices, projectId]
  );

  const resetForm = () => {
    setProjectId("");
    setInvoiceId("");
    setAmount("");
    setDueDate("");
    setMethod(PAYMENT_METHODS[0].value);
    setStatus("pending");
    setError(null);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
    if (searchParams.get("new") === "1") router.replace("/payments");
  };

  const save = async () => {
    if (!projectId || !amount) {
      setError("المشروع والمبلغ مطلوبان");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("payments").insert({
      company_id: companyId,
      project_id: projectId,
      invoice_id: invoiceId || null,
      amount: Number(amount),
      due_date: dueDate || null,
      paid_date: status === "paid" ? todayIso() : null,
      status,
      method: method || null,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    closeModal();
    router.refresh();
  };

  const markPaid = async (id: string) => {
    setUpdatingId(id);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("payments")
      .update({ status: "paid", paid_date: todayIso() })
      .eq("id", id);
    setUpdatingId(null);
    if (err) {
      setError(err.message);
      return;
    }
    router.refresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            الدفعات
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {initialPayments.length} دفعة
          </p>
        </div>
        <button className="btn btn-gold" onClick={() => setOpen(true)}>
          <Icon name="plus" size={16} /> دفعة جديدة
        </button>
      </div>

      <div
        className="stats-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}
      >
        <div className="stat-card">
          <span style={{ color: "#F59E0B", display: "inline-flex" }}>
            <Icon name="clock" size={20} />
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10, color: "#F59E0B" }}>
            {fmtMoney(stats.totalPending)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>إجمالي المعلّق</div>
        </div>
        <div className="stat-card">
          <span style={{ color: "#1DB954", display: "inline-flex" }}>
            <Icon name="checkCircle" size={20} />
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10, color: "#1DB954" }}>
            {fmtMoney(stats.totalPaid)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>إجمالي المدفوع</div>
        </div>
        <div className="stat-card">
          <span style={{ color: "#EF4444", display: "inline-flex" }}>
            <Icon name="alert" size={20} />
          </span>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 10, color: "#EF4444" }}>
            {fmtMoney(stats.totalOverdue)}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>إجمالي المتأخر</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            className={statusFilter === "all" ? "chip chip-gold" : "chip"}
            onClick={() => setStatusFilter("all")}
          >
            كل الحالات
          </button>
          {PAYMENT_STATUSES.map((s) => (
            <button
              key={s.value}
              className={statusFilter === s.value ? "chip chip-gold" : "chip"}
              onClick={() => setStatusFilter(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
          <input
            className="input-field"
            placeholder="بحث بالمشروع أو رقم الفاتورة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingInlineStart: 38 }}
          />
          <span
            style={{
              position: "absolute",
              insetInlineStart: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          >
            <Icon name="search" size={16} />
          </span>
        </div>
        <select
          className="input-field"
          style={{ width: "auto" }}
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="">كل المشاريع</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Icon name="payments" size={32} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد دفعات مطابقة</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>المشروع</th>
                <th>الفاتورة المرتبطة</th>
                <th>المبلغ</th>
                <th>طريقة الدفع</th>
                <th>تاريخ الاستحقاق</th>
                <th>تاريخ الدفع</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.project?.name ?? "—"}</td>
                  <td>{p.invoice?.number ?? "—"}</td>
                  <td>{fmtMoney(p.amount)}</td>
                  <td>{methodLabel(p.method)}</td>
                  <td>{fmtDate(p.due_date)}</td>
                  <td>{fmtDate(p.paid_date)}</td>
                  <td>
                    <StatusChip status={p.status} />
                  </td>
                  <td>
                    {(p.status === "pending" || p.status === "overdue") && (
                      <button
                        className="btn btn-outline"
                        style={{ padding: "6px 10px", fontSize: 12 }}
                        onClick={() => markPaid(p.id)}
                        disabled={updatingId === p.id}
                      >
                        {updatingId === p.id ? "جارٍ التحديث..." : "تحديد كمدفوعة"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="modal-overlay no-print" onClick={() => !saving && closeModal()}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>دفعة جديدة</h3>
              <button className="btn btn-ghost" style={{ padding: 6 }} onClick={closeModal}>
                <Icon name="close" size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                المشروع
                <select
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={projectId}
                  onChange={(e) => {
                    setProjectId(e.target.value);
                    setInvoiceId("");
                  }}
                >
                  <option value="">— اختر مشروعاً —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                الفاتورة المرتبطة (اختياري)
                <select
                  className="input-field"
                  style={{ marginTop: 6 }}
                  value={invoiceId}
                  onChange={(e) => setInvoiceId(e.target.value)}
                  disabled={!projectId}
                >
                  <option value="">— بدون فاتورة —</option>
                  {invoicesForProject.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.number} ({fmtMoney(i.amount)})
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: "flex", gap: 12 }}>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                  المبلغ (ر.س)
                  <input
                    className="input-field"
                    style={{ marginTop: 6 }}
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                  تاريخ الاستحقاق
                  <input
                    className="input-field"
                    style={{ marginTop: 6 }}
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                  طريقة الدفع
                  <select
                    className="input-field"
                    style={{ marginTop: 6 }}
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                  الحالة
                  <select
                    className="input-field"
                    style={{ marginTop: 6 }}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PaymentStatus)}
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {error && <p style={{ color: "#EF4444", fontSize: 13 }}>{error}</p>}

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button className="btn btn-gold" onClick={save} disabled={saving} style={{ flex: 1 }}>
                  {saving ? "جارٍ الحفظ..." : "حفظ الدفعة"}
                </button>
                <button className="btn btn-outline" onClick={closeModal} disabled={saving}>
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
