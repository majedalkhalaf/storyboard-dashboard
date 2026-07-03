"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import Modal, { Field } from "@/app/components/settings/Modal";
import { createClient } from "@/app/lib/supabase/client";
import { CLIENT_CRM_STATUSES, CLIENT_TYPE_LABELS } from "@/app/lib/constants";
import { safeStorageKey } from "@/app/lib/storage-path";
import type { ClientCrmStatus, ClientRecord, ClientType } from "@/app/lib/types";

export default function ClientFormModal({
  companyId,
  userId,
  teamMembers,
  editing,
  onClose,
  onSaved,
}: {
  companyId: string;
  userId: string;
  teamMembers: { id: string; full_name: string | null }[];
  editing: ClientRecord | null;
  onClose: () => void;
  onSaved: (client: ClientRecord) => void;
}) {
  const supabase = createClient();
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    contact_name: editing?.contact_name ?? "",
    client_type: editing?.client_type ?? ("company" as ClientType),
    city: editing?.city ?? "",
    email: editing?.email ?? "",
    phone: editing?.phone ?? "",
    assigned_to: editing?.assigned_to ?? "",
    status: editing?.status ?? ("active" as ClientCrmStatus),
    notes: editing?.notes ?? "",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(editing?.logo_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickLogo(file: File | null) {
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : editing?.logo_url ?? null);
  }

  async function save() {
    if (!form.name.trim()) {
      setError("اسم العميل مطلوب");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let logoUrl = editing?.logo_url ?? null;
      if (logoFile) {
        const path = `${companyId}/clients/${safeStorageKey(logoFile.name)}`;
        const { error: upErr } = await supabase.storage.from("public-assets").upload(path, logoFile, { upsert: false });
        if (!upErr) logoUrl = supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
      }

      const payload = {
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || null,
        client_type: form.client_type,
        city: form.city.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        assigned_to: form.assigned_to || null,
        status: form.status,
        notes: form.notes.trim() || null,
        logo_url: logoUrl,
      };

      if (editing) {
        const { data, error: err } = await supabase.from("clients").update(payload).eq("id", editing.id).select("*").single();
        if (err) throw err;
        onSaved(data as ClientRecord);
      } else {
        const { data, error: err } = await supabase
          .from("clients")
          .insert({ company_id: companyId, created_by: userId, ...payload })
          .select("*")
          .single();
        if (err) throw err;
        onSaved(data as ClientRecord);
      }
      onClose();
    } catch {
      setError("تعذّر حفظ بيانات العميل");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? "تعديل العميل" : "عميل جديد"}
      maxWidth={620}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-gold" onClick={save} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
          <button className="btn btn-outline" onClick={onClose}>
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

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            flexShrink: 0,
            background: logoPreview ? `center/cover no-repeat url(${logoPreview})` : "var(--bg-hover)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {!logoPreview && <Icon name="image" size={20} className="text-muted" />}
        </span>
        <label className="btn btn-outline" style={{ cursor: "pointer" }}>
          <Icon name="upload" size={13} /> شعار العميل
          <input type="file" accept="image/*" hidden onChange={(e) => pickLogo(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
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
        <Field label="جهة التواصل (اسم الشخص)">
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
    </Modal>
  );
}
