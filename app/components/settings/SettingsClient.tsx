"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import { isInternalAdmin } from "@/app/lib/permissions";
import Icon from "@/app/components/ui/Icon";
import type { Company, Profile } from "@/app/lib/types";

async function uploadPublicAsset(companyId: string, folder: string, file: File): Promise<string | null> {
  const supabase = createClient();
  const path = `${companyId}/${folder}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("public-assets").upload(path, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
  return data.publicUrl;
}

export default function SettingsClient({ company, profile }: { company: Company; profile: Profile }) {
  const admin = isInternalAdmin(profile.role);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            إعدادات الشركة
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            الهوية البصرية وبيانات الشركة الرسمية
          </p>
        </div>
        <Link href="/account" className="btn btn-outline">
          <Icon name="user" size={16} /> إعدادات حسابي الشخصي
        </Link>
      </div>

      <IdentityTab company={company} admin={admin} />
    </div>
  );
}

function IdentityTab({ company, admin }: { company: Company; admin: boolean }) {
  const [form, setForm] = useState({
    name: company.name,
    email: company.email ?? "",
    phone: company.phone ?? "",
    website: company.website ?? "",
    address: company.address ?? "",
    commercial_register: company.commercial_register ?? "",
    tax_number: company.tax_number ?? "",
    primary_color: company.primary_color,
    secondary_color: company.secondary_color,
    accent_color: company.accent_color,
    font_ar: company.font_ar ?? "Tajawal",
    font_en: company.font_en ?? "Inter",
  });
  const [logoUrl, setLogoUrl] = useState(company.logo_url);
  const [stampUrl, setStampUrl] = useState(company.stamp_url);
  const [signatureUrl, setSignatureUrl] = useState(company.signature_url);
  const [social, setSocial] = useState<Record<string, string>>(company.social_links ?? {});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  if (!admin) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 10 }}>{company.name}</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          هوية الشركة مرئية لك فقط للاطلاع. التعديل متاح لمالك الشركة أو المدير.
        </p>
      </div>
    );
  }

  async function handleUpload(folder: string, setter: (url: string) => void, file?: File) {
    if (!file) return;
    const url = await uploadPublicAsset(company.id, folder, file);
    if (url) setter(url);
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("companies")
      .update({ ...form, logo_url: logoUrl, stamp_url: stampUrl, signature_url: signatureUrl, social_links: social })
      .eq("id", company.id);
    setSaving(false);
    if (!error) setSavedAt(new Date().toLocaleTimeString("ar"));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <h3 style={{ fontWeight: 700 }}>الشعار والهوية البصرية</h3>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <AssetUploader label="الشعار" url={logoUrl} onFile={(f) => handleUpload("logo", setLogoUrl, f)} />
          <AssetUploader label="الختم" url={stampUrl} onFile={(f) => handleUpload("stamp", setStampUrl, f)} />
          <AssetUploader label="التوقيع" url={signatureUrl} onFile={(f) => handleUpload("signature", setSignatureUrl, f)} />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <ColorField label="اللون الأساسي" value={form.primary_color} onChange={(v) => setForm({ ...form, primary_color: v })} />
          <ColorField label="اللون الثانوي" value={form.secondary_color} onChange={(v) => setForm({ ...form, secondary_color: v })} />
          <ColorField label="لون التمييز" value={form.accent_color} onChange={(v) => setForm({ ...form, accent_color: v })} />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1, minWidth: 160 }}>
            الخط العربي
            <select className="input-field" style={{ marginTop: 6 }} value={form.font_ar} onChange={(e) => setForm({ ...form, font_ar: e.target.value })}>
              {["Tajawal", "Cairo", "Almarai", "IBM Plex Sans Arabic"].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 13, color: "var(--text-secondary)", flex: 1, minWidth: 160 }}>
            الخط الإنجليزي
            <select className="input-field" style={{ marginTop: 6 }} value={form.font_en} onChange={(e) => setForm({ ...form, font_en: e.target.value })}>
              {["Inter", "Poppins", "Roboto", "Montserrat"].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ fontWeight: 700 }}>بيانات الشركة</h3>
        <div className="settings-items-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="اسم الشركة" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="البريد الإلكتروني" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="رقم الهاتف" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="الموقع الإلكتروني" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
          <Field label="السجل التجاري" value={form.commercial_register} onChange={(v) => setForm({ ...form, commercial_register: v })} />
          <Field label="الرقم الضريبي" value={form.tax_number} onChange={(v) => setForm({ ...form, tax_number: v })} />
        </div>
        <Field label="العنوان" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
      </div>

      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ fontWeight: 700 }}>حسابات التواصل</h3>
        {["instagram", "twitter", "whatsapp", "tiktok", "snapchat"].map((key) => (
          <Field
            key={key}
            label={key}
            value={social[key] ?? ""}
            onChange={(v) => setSocial({ ...social, [key]: v })}
          />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button className="btn btn-gold" onClick={save} disabled={saving}>
          {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        </button>
        {savedAt && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>تم الحفظ {savedAt}</span>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
      {label}
      <input className="input-field" style={{ marginTop: 6 }} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
      {label}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 36, height: 36, border: "none", background: "none", cursor: "pointer" }} />
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{value}</span>
      </div>
    </label>
  );
}

/* eslint-disable @next/next/no-img-element */
function AssetUploader({
  label,
  url,
  onFile,
  round,
}: {
  label: string;
  url: string | null;
  onFile: (file?: File) => void;
  round?: boolean;
}) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 90,
          height: 90,
          borderRadius: round ? "50%" : 12,
          border: "1px dashed var(--border-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          background: "var(--bg-secondary)",
          marginBottom: 8,
        }}
      >
        {url ? (
          <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        ) : (
          <Icon name="image" size={22} className="text-muted" />
        )}
      </div>
      <label className="btn btn-ghost" style={{ fontSize: 11, padding: "4px 8px", cursor: "pointer" }}>
        {label}
        <input type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
    </div>
  );
}
