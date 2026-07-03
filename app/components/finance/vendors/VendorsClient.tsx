"use client";

import { Fragment, useMemo, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { isInternalAdmin } from "@/app/lib/permissions";
import { logActivity } from "@/app/lib/activity";
import { fmtMoney, fmtDate } from "@/app/components/finance/format";
import Icon from "@/app/components/ui/Icon";
import Modal, { Field } from "@/app/components/settings/Modal";
import type { Vendor } from "@/app/lib/types";

export interface VendorExpenseRow {
  id: string;
  vendor_id: string;
  title: string;
  amount: number;
  expense_date: string;
  project: { name: string } | null;
}

interface VendorForm {
  id: string | null;
  name: string;
  contact_name: string;
  phone: string;
  email: string;
  category: string;
  notes: string;
}

const emptyForm: VendorForm = { id: null, name: "", contact_name: "", phone: "", email: "", category: "", notes: "" };

export default function VendorsClient({
  companyId,
  initialVendors,
  vendorExpenses,
}: {
  companyId: string;
  initialVendors: Vendor[];
  vendorExpenses: VendorExpenseRow[];
}) {
  const { userId, profile } = useSession();
  const admin = isInternalAdmin(profile.role);
  const supabase = createClient();

  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<VendorForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expensesByVendor = useMemo(() => {
    const map = new Map<string, VendorExpenseRow[]>();
    for (const e of vendorExpenses) {
      const list = map.get(e.vendor_id) ?? [];
      list.push(e);
      map.set(e.vendor_id, list);
    }
    return map;
  }, [vendorExpenses]);

  const totalByVendor = useMemo(() => {
    const map = new Map<string, number>();
    for (const [vendorId, rows] of expensesByVendor.entries()) {
      map.set(vendorId, rows.reduce((s, r) => s + Number(r.amount), 0));
    }
    return map;
  }, [expensesByVendor]);

  const openNew = () => {
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (v: Vendor) => {
    setForm({
      id: v.id,
      name: v.name,
      contact_name: v.contact_name ?? "",
      phone: v.phone ?? "",
      email: v.email ?? "",
      category: v.category ?? "",
      notes: v.notes ?? "",
    });
    setError(null);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError("اسم المورد مطلوب");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      company_id: companyId,
      name: form.name.trim(),
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      category: form.category.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (form.id) {
      const { data, error: err } = await supabase.from("vendors").update(payload).eq("id", form.id).select("*").single();
      setSaving(false);
      if (err || !data) {
        setError("تعذّر حفظ التعديلات");
        return;
      }
      setVendors((prev) => prev.map((v) => (v.id === form.id ? (data as Vendor) : v)));
      await logActivity(supabase, { companyId, action: "vendor_updated", details: { name: payload.name } });
    } else {
      const { data, error: err } = await supabase
        .from("vendors")
        .insert({ ...payload, created_by: userId })
        .select("*")
        .single();
      setSaving(false);
      if (err || !data) {
        setError("تعذّر إضافة المورد");
        return;
      }
      setVendors((prev) => [...prev, data as Vendor].sort((a, b) => a.name.localeCompare(b.name, "ar")));
      await logActivity(supabase, { companyId, action: "vendor_created", details: { name: payload.name } });
    }
    setModalOpen(false);
  };

  const remove = async (v: Vendor) => {
    if (!confirm(`حذف المورد "${v.name}"؟`)) return;
    const { error: err } = await supabase.from("vendors").delete().eq("id", v.id);
    if (err) return;
    setVendors((prev) => prev.filter((x) => x.id !== v.id));
    await logActivity(supabase, { companyId, action: "vendor_deleted", details: { name: v.name } });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            الموردون
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{vendors.length} مورد</p>
        </div>
        {admin && (
          <button className="btn btn-gold" onClick={openNew}>
            <Icon name="plus" size={16} /> إضافة مورد
          </button>
        )}
      </div>

      {vendors.length === 0 ? (
        <div className="empty-state card">
          <Icon name="clients" size={32} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا يوجد موردون بعد</p>
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>الاسم</th>
                <th>جهة الاتصال</th>
                <th>الهاتف</th>
                <th>البريد</th>
                <th>الفئة</th>
                <th>إجمالي المصروفات</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => {
                const expanded = expandedId === v.id;
                const rows = expensesByVendor.get(v.id) ?? [];
                const total = totalByVendor.get(v.id) ?? 0;
                return (
                  <Fragment key={v.id}>
                    <tr style={{ cursor: "pointer" }} onClick={() => setExpandedId(expanded ? null : v.id)}>
                      <td style={{ width: 20 }}>
                        <span style={{ display: "inline-flex", transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>
                          <Icon name="chevronLeft" size={14} className="text-muted" />
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{v.name}</td>
                      <td>{v.contact_name || "—"}</td>
                      <td>{v.phone || "—"}</td>
                      <td>{v.email || "—"}</td>
                      <td>{v.category ? <span className="chip">{v.category}</span> : "—"}</td>
                      <td style={{ color: "#EF4444", fontWeight: 700 }}>{fmtMoney(total)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {admin && (
                          <div style={{ display: "flex", gap: 6 }}>
                            <button className="btn-ghost" style={{ padding: 6 }} onClick={() => openEdit(v)}>
                              <Icon name="edit" size={14} />
                            </button>
                            <button className="btn-ghost" style={{ padding: 6, color: "#EF4444" }} onClick={() => remove(v)}>
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={8} style={{ background: "var(--bg-hover)", padding: 16 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                            كشف حساب — {v.name}
                          </div>
                          {v.notes && <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>{v.notes}</p>}
                          {rows.length === 0 ? (
                            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>لا توجد مصروفات مرتبطة بهذا المورد بعد</p>
                          ) : (
                            <div style={{ overflow: "auto" }}>
                              <table className="data-table" style={{ background: "var(--bg-card)" }}>
                                <thead>
                                  <tr>
                                    <th>التاريخ</th>
                                    <th>البند</th>
                                    <th>المشروع</th>
                                    <th>المبلغ</th>
                                    <th>الإجمالي التراكمي</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    let running = 0;
                                    const sorted = [...rows].sort((a, b) => (a.expense_date < b.expense_date ? -1 : 1));
                                    return sorted.map((r) => {
                                      running += Number(r.amount);
                                      return (
                                        <tr key={r.id}>
                                          <td>{fmtDate(r.expense_date)}</td>
                                          <td>{r.title}</td>
                                          <td>{r.project?.name ?? "مصروف عام"}</td>
                                          <td>{fmtMoney(r.amount)}</td>
                                          <td style={{ fontWeight: 700 }}>{fmtMoney(running)}</td>
                                        </tr>
                                      );
                                    });
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={form.id ? "تعديل مورد" : "إضافة مورد"}
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-gold" onClick={save} disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>
                إلغاء
              </button>
            </>
          }
        >
          {error && (
            <div className="btn-danger" style={{ width: "100%", justifyContent: "center", marginBottom: 14, cursor: "default" }}>
              {error}
            </div>
          )}
          <Field label="اسم المورد">
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: شركة الإضاءة المتقدمة" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="جهة الاتصال">
              <input className="input-field" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            </Field>
            <Field label="الفئة">
              <input className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="مثال: معدات" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="الهاتف">
              <input className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="البريد الإلكتروني">
              <input className="input-field" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
          </div>
          <Field label="ملاحظات">
            <textarea className="input-field" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ resize: "vertical" }} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
