"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";
import { INVOICE_STATUSES } from "@/app/lib/constants";
import { fmtMoney, fmtDate, todayIso } from "@/app/components/finance/format";
import Icon from "@/app/components/ui/Icon";
import type { InvoiceStatus } from "@/app/lib/types";

interface InvoiceRow {
  id: string;
  number: string;
  amount: number;
  tax: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  project_id: string;
  client_id: string | null;
  projects: { name: string } | null;
  clients: { name: string } | null;
}

interface ProjectRow {
  id: string;
  name: string;
  client_id: string | null;
}

function StatusChip({ status }: { status: InvoiceStatus }) {
  const info = INVOICE_STATUSES.find((s) => s.value === status);
  return (
    <span className="chip" style={{ color: info?.color, borderColor: info?.color }}>
      {info?.label ?? status}
    </span>
  );
}

export default function InvoicesClient({
  companyId,
  initialInvoices,
  projects,
}: {
  companyId: string;
  initialInvoices: InvoiceRow[];
  projects: ProjectRow[];
}) {
  const { profile, userId } = useSession();
  const router = useRouter();
  const admin = isInternalAdmin(profile.role);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState("");
  const [amount, setAmount] = useState("");
  const [tax, setTax] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("unpaid");
  const [notes, setNotes] = useState("");

  const filtered = useMemo(() => {
    return initialInvoices.filter((i) => {
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${i.number} ${i.projects?.name ?? ""} ${i.clients?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [initialInvoices, statusFilter, search]);

  const resetForm = () => {
    setProjectId("");
    setAmount("");
    setTax("");
    setDueDate("");
    setStatus("unpaid");
    setNotes("");
    setError(null);
  };

  const save = async () => {
    if (!projectId || !amount) {
      setError("المشروع والمبلغ مطلوبان");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const project = projects.find((p) => p.id === projectId);
    const number = `INV-${Date.now().toString().slice(-6)}`;
    const { data, error: err } = await supabase
      .from("invoices")
      .insert({
        company_id: companyId,
        project_id: projectId,
        client_id: project?.client_id ?? null,
        number,
        issue_date: todayIso(),
        due_date: dueDate || null,
        amount: Number(amount),
        tax: tax ? Number(tax) : 0,
        status,
        notes: notes.trim() || null,
        created_by: userId,
      })
      .select("id")
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setOpen(false);
    resetForm();
    if (data?.id) router.push(`/invoices/${data.id}`);
    else router.refresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            الفواتير
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {initialInvoices.length} فاتورة
          </p>
        </div>
        {admin && (
          <button className="btn btn-gold" onClick={() => setOpen(true)}>
            <Icon name="plus" size={16} /> فاتورة جديدة
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
          <input
            className="input-field"
            placeholder="بحث برقم الفاتورة أو المشروع أو العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingInlineStart: 38 }}
          />
          <span style={{ position: "absolute", insetInlineStart: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
            <Icon name="search" size={16} />
          </span>
        </div>
        <select
          className="input-field"
          style={{ width: "auto" }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | "all")}
        >
          <option value="all">كل الحالات</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Icon name="invoices" size={32} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد فواتير مطابقة</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>المشروع</th>
                <th>العميل</th>
                <th>المبلغ</th>
                <th>الحالة</th>
                <th>الاستحقاق</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 700 }}>
                    <Link href={`/invoices/${i.id}`} style={{ color: "var(--gold)" }}>
                      {i.number}
                    </Link>
                  </td>
                  <td>{i.projects?.name ?? "—"}</td>
                  <td>{i.clients?.name ?? "—"}</td>
                  <td>{fmtMoney(Number(i.amount) + Number(i.tax ?? 0))}</td>
                  <td>
                    <StatusChip status={i.status} />
                  </td>
                  <td>{fmtDate(i.due_date)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Link href={`/invoices/${i.id}`} className="btn btn-ghost" style={{ padding: 6 }} title="عرض">
                        <Icon name="eye" size={16} />
                      </Link>
                      <Link
                        href={`/invoices/${i.id}/print`}
                        className="btn btn-ghost"
                        style={{ padding: 6 }}
                        title="طباعة / PDF"
                      >
                        <Icon name="export" size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="modal-overlay no-print" onClick={() => !saving && setOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>فاتورة جديدة</h3>
              <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setOpen(false)}>
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
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  <option value="">— اختر مشروعاً —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
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
                  الضريبة (ر.س)
                  <input
                    className="input-field"
                    style={{ marginTop: 6 }}
                    type="number"
                    min="0"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
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
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </label>
                <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1 }}>
                  الحالة
                  <select
                    className="input-field"
                    style={{ marginTop: 6 }}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
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
                ملاحظات (اختياري)
                <textarea
                  className="input-field"
                  style={{ marginTop: 6, minHeight: 70, resize: "vertical" }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>

              {error && <p style={{ color: "#EF4444", fontSize: 13 }}>{error}</p>}

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button className="btn btn-gold" onClick={save} disabled={saving} style={{ flex: 1 }}>
                  {saving ? "جارٍ الإنشاء..." : "إنشاء الفاتورة"}
                </button>
                <button className="btn btn-outline" onClick={() => setOpen(false)} disabled={saving}>
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
