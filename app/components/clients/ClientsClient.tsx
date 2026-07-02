"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import Modal, { Field } from "@/app/components/settings/Modal";
import { createClient } from "@/app/lib/supabase/client";
import type { ClientRecord } from "@/app/lib/types";

export default function ClientsClient({
  initialClients,
  activeCounts,
  companyId,
  userId,
}: {
  initialClients: ClientRecord[];
  activeCounts: Record<string, number>;
  companyId: string;
  userId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [clients, setClients] = useState<ClientRecord[]>(initialClients);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const openNew = () => {
    setForm({ name: "", email: "", phone: "", notes: "" });
    setError(null);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError("اسم العميل مطلوب");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("clients")
      .insert({
        company_id: companyId,
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        created_by: userId,
      })
      .select("*")
      .single();
    if (err) {
      setError("تعذّر إضافة العميل");
      setSaving(false);
      return;
    }
    setClients((prev) => [data as ClientRecord, ...prev]);
    setSaving(false);
    setModalOpen(false);
  };

  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>العملاء</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>دليل عملاء الشركة وصلاحيات وصولهم للمشاريع</p>
        </div>
        <button className="btn btn-gold" onClick={openNew}>
          <Icon name="plus" size={16} /> عميل جديد
        </button>
      </div>

      <div style={{ position: "relative", maxWidth: 340 }}>
        <span style={{ position: "absolute", top: "50%", right: 12, transform: "translateY(-50%)", color: "var(--text-muted)" }}>
          <Icon name="search" size={16} />
        </span>
        <input
          className="input-field"
          style={{ paddingRight: 38 }}
          placeholder="بحث بالاسم أو البريد أو الهاتف"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Icon name="clients" size={32} className="text-muted" />
          <p style={{ marginTop: 12 }}>{clients.length === 0 ? "لا يوجد عملاء بعد" : "لا توجد نتائج مطابقة"}</p>
          {clients.length === 0 && (
            <button className="btn btn-gold" style={{ marginTop: 14 }} onClick={openNew}>
              <Icon name="plus" size={16} /> إضافة أول عميل
            </button>
          )}
        </div>
      ) : (
        <div className="card table-scroll" style={{ overflow: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>البريد الإلكتروني</th>
                <th>الهاتف</th>
                <th>مشاريع نشطة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/clients/${c.id}`)}>
                  <td style={{ fontWeight: 700 }}>{c.name}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{c.email || "—"}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{c.phone || "—"}</td>
                  <td>
                    <span className="chip chip-gold">{activeCounts[c.id] ?? 0}</span>
                  </td>
                  <td>
                    <Icon name="chevronLeft" size={18} className="text-muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title="عميل جديد"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="btn btn-gold" onClick={save} disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </button>
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>إلغاء</button>
            </>
          }
        >
          {error && <div className="btn-danger" style={{ width: "100%", justifyContent: "center", marginBottom: 14, cursor: "default" }}>{error}</div>}
          <Field label="الاسم">
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="البريد الإلكتروني">
            <input type="email" dir="ltr" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="الهاتف">
            <input dir="ltr" className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="ملاحظات">
            <textarea className="input-field" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ resize: "vertical" }} />
          </Field>
        </Modal>
      )}
    </div>
  );
}
