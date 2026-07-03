"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { CLIENT_CRM_STATUSES, CLIENT_TYPE_LABELS } from "@/app/lib/constants";
import type { ClientCrmStatus, ClientRecord, ClientType } from "@/app/lib/types";

export default function SettingsTab({
  client,
  teamMembers,
}: {
  client: ClientRecord;
  teamMembers: { id: string; full_name: string | null }[];
}) {
  const supabase = createClient();
  const router = useRouter();
  const [form, setForm] = useState({
    name: client.name,
    contact_name: client.contact_name ?? "",
    client_type: client.client_type,
    city: client.city ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    assigned_to: client.assigned_to ?? "",
    status: client.status,
    notes: client.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("clients")
      .update({
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || null,
        client_type: form.client_type,
        city: form.city.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        assigned_to: form.assigned_to || null,
        status: form.status,
        notes: form.notes.trim() || null,
      })
      .eq("id", client.id);
    setSaving(false);
    setMsg(error ? "تعذّر الحفظ" : "تم الحفظ");
    if (!error) router.refresh();
    setTimeout(() => setMsg(null), 2500);
  }

  async function deleteClient() {
    if (!confirm(`حذف العميل "${client.name}" نهائياً؟ لن يؤثر هذا على مشاريعه الحالية لكن سيُفصل ارتباطها بهذا السجل.`)) return;
    await supabase.from("clients").delete().eq("id", client.id);
    router.push("/clients");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>بيانات العميل</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <Field label="اسم الشركة/العميل">
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="نوع العميل">
            <select className="input-field" value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value as ClientType })}>
              {(Object.keys(CLIENT_TYPE_LABELS) as ClientType[]).map((t) => (
                <option key={t} value={t}>
                  {CLIENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="جهة التواصل">
            <input className="input-field" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
          </Field>
          <Field label="المدينة">
            <input className="input-field" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="البريد الإلكتروني">
            <input dir="ltr" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="الجوال / واتساب">
            <input dir="ltr" className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="المسؤول داخل الشركة">
            <select className="input-field" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}>
              <option value="">غير مسند</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || "بدون اسم"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="الحالة">
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ClientCrmStatus })}>
              {CLIENT_CRM_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="ملاحظات">
          <textarea className="input-field" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ resize: "vertical" }} />
        </Field>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
          <button className="btn btn-gold" onClick={save} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
          {msg && <span style={{ fontSize: 13, color: "var(--gold)" }}>{msg}</span>}
        </div>
      </div>

      <div className="card" style={{ padding: 20, borderColor: "#EF4444" }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: "#EF4444" }}>منطقة الخطر</h3>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>حذف العميل نهائياً من سجل الشركة. لا يمكن التراجع عن هذا الإجراء.</p>
        <button className="btn btn-danger" onClick={deleteClient}>
          <Icon name="trash" size={14} /> حذف العميل
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>{label}</span>
      {children}
    </label>
  );
}
