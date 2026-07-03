"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import Icon from "@/app/components/ui/Icon";
import type { Company } from "@/app/lib/types";

// إعدادات مالية على مستوى الشركة — الأعمدة الثلاثة أدناه مُضافة عبر
// supabase/migrations/0019_finance_settings.sql. الهجرة لم تُطبَّق بعد على قاعدة
// البيانات (لا صلاحية وصول لقاعدة بيانات فعلية في بيئة بناء هذه الصفحة)، لذا سيفشل
// الحفظ فعلياً حتى تُطبَّق الهجرة من قِبل من يملك صلاحية الوصول لمشروع Supabase.
export default function FinanceSettingsClient({ company }: { company: Company }) {
  const [form, setForm] = useState({
    default_tax_rate: company.default_tax_rate ?? 15,
    invoice_number_prefix: company.invoice_number_prefix ?? "INV",
    default_payment_terms_days: company.default_payment_terms_days ?? 30,
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from("companies").update(form).eq("id", company.id);
    setSaving(false);
    if (err) {
      setError("تعذّر الحفظ — تأكد من أن هجرة 0019_finance_settings.sql مُطبَّقة على قاعدة البيانات.");
      return;
    }
    setSavedAt(new Date().toLocaleTimeString("ar"));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
          الإعدادات المالية
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          إعدادات عامة تُستخدم كقيم مبدئية عند إنشاء فواتير ومستندات مالية جديدة
        </p>
      </div>

      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <h3 style={{ fontWeight: 700 }}>القيم الافتراضية</h3>
        <div className="settings-items-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            نسبة الضريبة الافتراضية (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              className="input-field"
              style={{ marginTop: 6 }}
              value={form.default_tax_rate}
              onChange={(e) => setForm({ ...form, default_tax_rate: Number(e.target.value) })}
            />
          </label>
          <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            بادئة رقم الفاتورة
            <input
              className="input-field"
              style={{ marginTop: 6 }}
              value={form.invoice_number_prefix}
              onChange={(e) => setForm({ ...form, invoice_number_prefix: e.target.value })}
            />
          </label>
          <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            مهلة السداد الافتراضية (يوم)
            <input
              type="number"
              min={0}
              className="input-field"
              style={{ marginTop: 6 }}
              value={form.default_payment_terms_days}
              onChange={(e) => setForm({ ...form, default_payment_terms_days: Number(e.target.value) })}
            />
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-gold" onClick={save} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
          {savedAt && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>تم الحفظ {savedAt}</span>}
          {error && <span style={{ fontSize: 12, color: "#EF4444" }}>{error}</span>}
        </div>
      </div>

      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ fontWeight: 700 }}>إدارة مرتبطة</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
          <Link href="/accounts/settings/categories" className="btn btn-outline">
            <Icon name="sliders" size={16} /> إدارة التصنيفات المالية
          </Link>
          <Link href="/accounts/settings/bank-accounts" className="btn btn-outline">
            <Icon name="storage" size={16} /> إدارة الحسابات البنكية
          </Link>
          <Link href="/accounts/settings/vendors" className="btn btn-outline">
            <Icon name="clients" size={16} /> إدارة الموردين
          </Link>
          <Link href="/accounts/settings/documents" className="btn btn-outline">
            <Icon name="files" size={16} /> المستندات المالية
          </Link>
          <Link href="/settings/invite-channels" className="btn btn-outline">
            <Icon name="mail" size={16} /> قنوات إرسال الدعوات
          </Link>
        </div>
      </div>
    </div>
  );
}
