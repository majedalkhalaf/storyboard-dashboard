"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import { isInternalAdmin } from "@/app/lib/permissions";
import Icon from "@/app/components/ui/Icon";
import { getCompanyPipelineStages } from "@/app/lib/pipeline-stages";
import CompanyBankAccountsSection from "@/app/components/settings/CompanyBankAccountsSection";
import {
  addCompanyPipelineStage,
  deleteCompanyPipelineStage,
  swapCompanyPipelineStageOrder,
  updateCompanyPipelineStage,
} from "@/app/lib/company-pipeline-stages-actions";
import type { Company, CompanyPipelineStage, Profile } from "@/app/lib/types";

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

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <IdentityTab company={company} admin={admin} />
        {admin && <PipelineStagesSection companyId={company.id} />}
      </div>
    </div>
  );
}

// إدارة مراحل "تغيير المرحلة" السريعة لكل شركة — مقصورة على المدير/المالك في
// الواجهة فقط كخيار منتج (تقليل الفوضى لبقية الفريق)، وليس لأن RLS يفرض ذلك:
// سياسة company_pipeline_stages (0016_episode_pipeline_stage.sql) تسمح لأي
// عضو بالشركة بالإدارة الكاملة.
function PipelineStagesSection({ companyId }: { companyId: string }) {
  const [stages, setStages] = useState<CompanyPipelineStage[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    getCompanyPipelineStages(supabase, companyId).then(setStages);
  }, [companyId]);

  async function handleAdd() {
    const label = window.prompt("اسم المرحلة الجديدة:");
    if (!label || !label.trim()) return;
    const supabase = createClient();
    const created = await addCompanyPipelineStage(supabase, companyId, stages ?? [], label.trim());
    setStages((prev) => [...(prev ?? []), created]);
  }

  async function handleDelete(stage: CompanyPipelineStage) {
    if (!window.confirm(`حذف مرحلة "${stage.label}"؟ هذا لن يؤثر على أي حلقة تستخدمها حالياً.`)) return;
    const supabase = createClient();
    await deleteCompanyPipelineStage(supabase, stage.id);
    setStages((prev) => (prev ?? []).filter((s) => s.id !== stage.id));
  }

  function patchLocal(id: string, patch: Partial<CompanyPipelineStage>) {
    setStages((prev) => (prev ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  async function handleLabelBlur(stage: CompanyPipelineStage, label: string) {
    if (label === stage.label) return;
    const supabase = createClient();
    await updateCompanyPipelineStage(supabase, stage.id, { label });
  }

  async function handleColorChange(stage: CompanyPipelineStage, color: string) {
    patchLocal(stage.id, { color });
    const supabase = createClient();
    await updateCompanyPipelineStage(supabase, stage.id, { color });
  }

  async function handleNotifyToggle(stage: CompanyPipelineStage) {
    const next = !stage.notify_client;
    patchLocal(stage.id, { notify_client: next });
    const supabase = createClient();
    await updateCompanyPipelineStage(supabase, stage.id, { notify_client: next });
  }

  async function handleMove(index: number, direction: "up" | "down") {
    if (!stages) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= stages.length) return;
    const current = stages[index];
    const other = stages[swapIndex];
    const supabase = createClient();
    await swapCompanyPipelineStageOrder(supabase, current, other);
    const next = [...stages];
    next[index] = { ...current, sort_order: other.sort_order };
    next[swapIndex] = { ...other, sort_order: current.sort_order };
    next.sort((a, b) => a.sort_order - b.sort_order);
    setStages(next);
  }

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ fontWeight: 700 }}>مراحل العمل السريعة</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            تُستخدم في اختصار «تغيير المرحلة» أعلى كل حلقة — منفصلة عن نظام مراحل التنفيذ التفصيلي.
          </p>
        </div>
        <button className="btn btn-outline" style={{ padding: "7px 14px", fontSize: 12 }} onClick={handleAdd} disabled={stages === null}>
          <Icon name="plus" size={14} /> إضافة مرحلة
        </button>
      </div>

      {stages === null ? (
        <div className="skeleton" style={{ height: 160, borderRadius: 10 }} />
      ) : stages.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا توجد مراحل بعد</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stages.map((stage, i) => (
            <div
              key={stage.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                border: "1px solid var(--border)",
                borderRadius: 10,
                flexWrap: "wrap",
              }}
            >
              <input
                type="color"
                value={stage.color}
                onChange={(e) => handleColorChange(stage, e.target.value)}
                style={{ width: 30, height: 30, border: "none", background: "none", cursor: "pointer", flexShrink: 0 }}
                title="لون المرحلة"
              />
              <input
                className="input-field"
                defaultValue={stage.label}
                onChange={(e) => patchLocal(stage.id, { label: e.target.value })}
                onBlur={(e) => handleLabelBlur(stage, e.target.value)}
                style={{ flex: 1, minWidth: 140, fontSize: 13 }}
              />
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-muted)", flexShrink: 0, whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={stage.notify_client} onChange={() => handleNotifyToggle(stage)} />
                إشعار العميل عند هذه المرحلة
              </label>
              <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                <button className="btn-ghost" style={{ padding: "4px 6px", borderRadius: 6 }} disabled={i === 0} onClick={() => handleMove(i, "up")} title="نقل لأعلى">
                  <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}>
                    <Icon name="chevronDown" size={14} />
                  </span>
                </button>
                <button
                  className="btn-ghost"
                  style={{ padding: "4px 6px", borderRadius: 6 }}
                  disabled={i === stages.length - 1}
                  onClick={() => handleMove(i, "down")}
                  title="نقل لأسفل"
                >
                  <Icon name="chevronDown" size={14} />
                </button>
                <button className="btn-ghost" style={{ padding: "4px 6px", borderRadius: 6, color: "#ef4444" }} onClick={() => handleDelete(stage)} title="حذف المرحلة">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "X (Twitter)" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "facebook", label: "Facebook" },
  { key: "snapchat", label: "Snapchat" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "behance", label: "Behance" },
  { key: "vimeo", label: "Vimeo" },
  { key: "whatsapp", label: "واتساب (رابط)" },
];

const SIGNATURE_ROLES: { key: import("@/app/lib/types").CompanySignatureKey; label: string; field: keyof Company }[] = [
  { key: "manager", label: "توقيع المدير", field: "signature_url" },
  { key: "executive", label: "توقيع المدير التنفيذي", field: "signature_executive_url" },
  { key: "accountant", label: "توقيع المحاسب", field: "signature_accountant_url" },
  { key: "project_manager", label: "توقيع مدير المشروع", field: "signature_pm_url" },
];

function IdentityTab({ company, admin }: { company: Company; admin: boolean }) {
  const [form, setForm] = useState({
    name: company.name,
    name_en: company.name_en ?? "",
    trade_name: company.trade_name ?? "",
    short_description: company.short_description ?? "",
    about_text: company.about_text ?? "",
    mission: company.mission ?? "",
    vision: company.vision ?? "",
    company_values: company.company_values ?? "",
    business_activity: company.business_activity ?? "",
    commercial_register: company.commercial_register ?? "",
    tax_number: company.tax_number ?? "",
    establishment_number: company.establishment_number ?? "",
    chamber_number: company.chamber_number ?? "",
    founded_date: company.founded_date ?? "",
    country: company.country ?? "",
    city: company.city ?? "",
    address: company.address ?? "",
    postal_code: company.postal_code ?? "",
    email: company.email ?? "",
    finance_email: company.finance_email ?? "",
    support_email: company.support_email ?? "",
    phone: company.phone ?? "",
    mobile_phone: company.mobile_phone ?? "",
    whatsapp_number: company.whatsapp_number ?? "",
    website: company.website ?? "",
    primary_color: company.primary_color,
    secondary_color: company.secondary_color,
    accent_color: company.accent_color,
    button_color: company.button_color ?? company.primary_color,
    alert_color: company.alert_color ?? "#EF4444",
    font_ar: company.font_ar ?? "Tajawal",
    font_en: company.font_en ?? "Inter",
    default_signature_key: company.default_signature_key,
  });
  const [assets, setAssets] = useState<Record<string, string | null>>({
    logo_url: company.logo_url,
    logo_white_url: company.logo_white_url,
    logo_black_url: company.logo_black_url,
    favicon_url: company.favicon_url,
    document_logo_url: company.document_logo_url,
    cover_image_url: company.cover_image_url,
    client_portal_logo_url: company.client_portal_logo_url,
    stamp_url: company.stamp_url,
    signature_url: company.signature_url,
    signature_executive_url: company.signature_executive_url,
    signature_accountant_url: company.signature_accountant_url,
    signature_pm_url: company.signature_pm_url,
  });
  const [social, setSocial] = useState<Record<string, string>>(company.social_links ?? {});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  if (!admin) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontWeight: 700, marginBottom: 10 }}>{company.name}</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          ملف الشركة مرئي لك فقط للاطلاع. التعديل متاح لمالك الشركة أو المدير.
        </p>
      </div>
    );
  }

  async function handleUpload(folder: string, key: string, file?: File) {
    if (!file) return;
    const url = await uploadPublicAsset(company.id, folder, file);
    if (url) setAssets((prev) => ({ ...prev, [key]: url }));
  }

  async function save() {
    setSaving(true);
    const supabase = createClient();
    const { founded_date, ...restForm } = form;
    const { error } = await supabase
      .from("companies")
      .update({ ...restForm, founded_date: founded_date || null, ...assets, social_links: social })
      .eq("id", company.id);
    setSaving(false);
    if (!error) setSavedAt(new Date().toLocaleTimeString("ar"));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* أولاً: الهوية البصرية */}
      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <h3 style={{ fontWeight: 700 }}>الهوية البصرية</h3>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <AssetUploader label="الشعار الرئيسي" url={assets.logo_url} onFile={(f) => handleUpload("logo", "logo_url", f)} />
          <AssetUploader label="الشعار (نسخة بيضاء)" url={assets.logo_white_url} onFile={(f) => handleUpload("logo-white", "logo_white_url", f)} />
          <AssetUploader label="الشعار (نسخة سوداء)" url={assets.logo_black_url} onFile={(f) => handleUpload("logo-black", "logo_black_url", f)} />
          <AssetUploader label="أيقونة الموقع (Favicon)" url={assets.favicon_url} onFile={(f) => handleUpload("favicon", "favicon_url", f)} round />
          <AssetUploader label="ختم الشركة الرسمي" url={assets.stamp_url} onFile={(f) => handleUpload("stamp", "stamp_url", f)} />
          <AssetUploader label="شعار المستندات الرسمية" url={assets.document_logo_url} onFile={(f) => handleUpload("document-logo", "document_logo_url", f)} />
          <AssetUploader label="صورة غلاف الشركة" url={assets.cover_image_url} onFile={(f) => handleUpload("cover", "cover_image_url", f)} />
          <AssetUploader label="صورة بوابة العملاء" url={assets.client_portal_logo_url} onFile={(f) => handleUpload("client-portal-logo", "client_portal_logo_url", f)} />
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <ColorField label="اللون الأساسي" value={form.primary_color} onChange={(v) => setForm({ ...form, primary_color: v })} />
          <ColorField label="اللون الثانوي" value={form.secondary_color} onChange={(v) => setForm({ ...form, secondary_color: v })} />
          <ColorField label="لون التمييز" value={form.accent_color} onChange={(v) => setForm({ ...form, accent_color: v })} />
          <ColorField label="لون الأزرار" value={form.button_color} onChange={(v) => setForm({ ...form, button_color: v })} />
          <ColorField label="لون التنبيهات" value={form.alert_color} onChange={(v) => setForm({ ...form, alert_color: v })} />
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

      {/* ثانياً: بيانات الشركة */}
      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ fontWeight: 700 }}>بيانات الشركة</h3>
        <div className="settings-items-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="اسم الشركة (عربي)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="اسم الشركة (إنجليزي)" value={form.name_en} onChange={(v) => setForm({ ...form, name_en: v })} />
          <Field label="الاسم التجاري" value={form.trade_name} onChange={(v) => setForm({ ...form, trade_name: v })} />
          <Field label="النشاط التجاري" value={form.business_activity} onChange={(v) => setForm({ ...form, business_activity: v })} />
          <Field label="رقم السجل التجاري" value={form.commercial_register} onChange={(v) => setForm({ ...form, commercial_register: v })} />
          <Field label="الرقم الضريبي" value={form.tax_number} onChange={(v) => setForm({ ...form, tax_number: v })} />
          <Field label="رقم المنشأة" value={form.establishment_number} onChange={(v) => setForm({ ...form, establishment_number: v })} />
          <Field label="رقم الغرفة التجارية" value={form.chamber_number} onChange={(v) => setForm({ ...form, chamber_number: v })} />
          <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            تاريخ التأسيس
            <input type="date" className="input-field" style={{ marginTop: 6 }} value={form.founded_date} onChange={(e) => setForm({ ...form, founded_date: e.target.value })} />
          </label>
          <Field label="الدولة" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
          <Field label="المدينة" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field label="الرمز البريدي" value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} />
        </div>
        <Field label="العنوان الكامل" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
        <TextArea label="وصف مختصر" value={form.short_description} onChange={(v) => setForm({ ...form, short_description: v })} />
        <TextArea label="نبذة تعريفية" value={form.about_text} onChange={(v) => setForm({ ...form, about_text: v })} />
        <div className="settings-items-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <TextArea label="رسالة الشركة" value={form.mission} onChange={(v) => setForm({ ...form, mission: v })} rows={2} />
          <TextArea label="رؤية الشركة" value={form.vision} onChange={(v) => setForm({ ...form, vision: v })} rows={2} />
        </div>
        <TextArea label="قيم الشركة" value={form.company_values} onChange={(v) => setForm({ ...form, company_values: v })} rows={2} />
      </div>

      {/* ثالثاً: معلومات التواصل */}
      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ fontWeight: 700 }}>معلومات التواصل</h3>
        <div className="settings-items-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="البريد الإلكتروني الرئيسي" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field label="البريد المالي" value={form.finance_email} onChange={(v) => setForm({ ...form, finance_email: v })} />
          <Field label="بريد الدعم الفني" value={form.support_email} onChange={(v) => setForm({ ...form, support_email: v })} />
          <Field label="الموقع الإلكتروني" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
          <Field label="رقم الهاتف" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
          <Field label="رقم الجوال" value={form.mobile_phone} onChange={(v) => setForm({ ...form, mobile_phone: v })} />
          <Field label="رقم الواتساب" value={form.whatsapp_number} onChange={(v) => setForm({ ...form, whatsapp_number: v })} />
        </div>
      </div>

      {/* رابعاً: الحسابات البنكية */}
      <CompanyBankAccountsSection companyId={company.id} />

      {/* خامساً: وسائل التواصل الاجتماعي */}
      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ fontWeight: 700 }}>وسائل التواصل الاجتماعي</h3>
        <div className="settings-items-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {SOCIAL_PLATFORMS.map(({ key, label }) => (
            <Field key={key} label={label} value={social[key] ?? ""} onChange={(v) => setSocial({ ...social, [key]: v })} />
          ))}
        </div>
      </div>

      {/* سادساً: بيانات التوقيع والختم */}
      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <h3 style={{ fontWeight: 700 }}>التوقيع والختم</h3>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {SIGNATURE_ROLES.map((role) => (
            <AssetUploader
              key={role.key}
              label={role.label}
              url={assets[role.field as string]}
              onFile={(f) => handleUpload(`signature-${role.key}`, role.field as string, f)}
            />
          ))}
        </div>
        <label style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 280 }}>
          التوقيع الافتراضي (يُستخدم تلقائياً في المستندات)
          <select
            className="input-field"
            style={{ marginTop: 6 }}
            value={form.default_signature_key}
            onChange={(e) => setForm({ ...form, default_signature_key: e.target.value as Company["default_signature_key"] })}
          >
            {SIGNATURE_ROLES.map((role) => (
              <option key={role.key} value={role.key}>
                {role.label}
              </option>
            ))}
          </select>
        </label>
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

function TextArea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
      {label}
      <textarea className="input-field" rows={rows} style={{ marginTop: 6, resize: "vertical" }} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
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
