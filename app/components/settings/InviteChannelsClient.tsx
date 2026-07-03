"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { logActivity } from "@/app/lib/activity";
import Icon from "@/app/components/ui/Icon";
import Modal, { Field } from "@/app/components/settings/Modal";
import type { CompanyEmailSenderPublic, CompanySenderNumber } from "@/app/lib/types";

interface SenderForm {
  id: string | null;
  label: string;
  fromName: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUsername: string;
  smtpPassword: string;
  isDefault: boolean;
}

const emptySenderForm: SenderForm = {
  id: null,
  label: "",
  fromName: "",
  fromEmail: "",
  smtpHost: "",
  smtpPort: "587",
  smtpSecure: false,
  smtpUsername: "",
  smtpPassword: "",
  isDefault: false,
};

interface NumberForm {
  id: string | null;
  label: string;
  phone_number: string;
  notes: string;
  is_default: boolean;
}

const emptyNumberForm: NumberForm = { id: null, label: "", phone_number: "", notes: "", is_default: false };

interface TestState {
  loading: boolean;
  success?: boolean;
  message?: string;
}

export default function InviteChannelsClient({
  companyId,
  initialNumbers,
}: {
  companyId: string;
  initialNumbers: CompanySenderNumber[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
          قنوات إرسال الدعوات
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          إدارة عناوين البريد المُرسِل منها دعوات العملاء عبر SMTP، والأرقام المرجعية المستخدمة عند نسخ رابط الدعوة يدوياً
        </p>
      </div>

      <EmailSendersSection />
      <SenderNumbersSection companyId={companyId} initialNumbers={initialNumbers} />
    </div>
  );
}

// ══════════════════ أ. عناوين البريد المرسِل (SMTP) ══════════════════
// تمر حصراً عبر مسارات API (app/api/settings/email-senders/*) وليس عبر عميل Supabase
// مباشرة، لأن جدول company_email_senders بلا أي سياسة RLS عمداً (smtp_password حساس).
function EmailSendersSection() {
  const [senders, setSenders] = useState<CompanyEmailSenderPublic[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const loadSenders = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/email-senders");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "تعذّر تحميل قائمة عناوين البريد المرسِل");
      setSenders(json.senders ?? []);
      setListError(null);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "تعذّر تحميل قائمة عناوين البريد المرسِل");
      setSenders([]);
    }
  }, []);

  useEffect(() => {
    loadSenders();
  }, [loadSenders]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<SenderForm>(emptySenderForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [testState, setTestState] = useState<Record<string, TestState>>({});

  function openNew() {
    setForm(emptySenderForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(s: CompanyEmailSenderPublic) {
    setForm({
      id: s.id,
      label: s.label,
      fromName: s.from_name,
      fromEmail: s.from_email,
      smtpHost: s.smtp_host,
      smtpPort: String(s.smtp_port),
      smtpSecure: s.smtp_secure,
      smtpUsername: s.smtp_username,
      smtpPassword: "",
      isDefault: s.is_default,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function save() {
    if (!form.label.trim() || !form.fromName.trim() || !form.fromEmail.trim() || !form.smtpHost.trim() || !form.smtpUsername.trim()) {
      setFormError("جميع الحقول مطلوبة (باستثناء كلمة المرور عند التعديل)");
      return;
    }
    if (!form.id && !form.smtpPassword.trim()) {
      setFormError("كلمة مرور SMTP مطلوبة عند إضافة بريد جديد");
      return;
    }
    setSaving(true);
    setFormError(null);
    const body: Record<string, unknown> = {
      label: form.label.trim(),
      fromName: form.fromName.trim(),
      fromEmail: form.fromEmail.trim(),
      smtpHost: form.smtpHost.trim(),
      smtpPort: Number(form.smtpPort) || 587,
      smtpSecure: form.smtpSecure,
      smtpUsername: form.smtpUsername.trim(),
      isDefault: form.isDefault,
    };
    if (form.smtpPassword.trim()) body.smtpPassword = form.smtpPassword.trim();

    try {
      const res = await fetch(form.id ? `/api/settings/email-senders/${form.id}` : "/api/settings/email-senders", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "تعذّر حفظ بريد الإرسال");
      await loadSenders();
      setModalOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "تعذّر حفظ بريد الإرسال");
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(s: CompanyEmailSenderPublic) {
    await fetch(`/api/settings/email-senders/${s.id}/set-default`, { method: "POST" });
    await loadSenders();
  }

  async function remove(s: CompanyEmailSenderPublic) {
    if (!confirm(`حذف بريد الإرسال "${s.label}"؟`)) return;
    const res = await fetch(`/api/settings/email-senders/${s.id}`, { method: "DELETE" });
    if (res.ok) await loadSenders();
  }

  async function test(s: CompanyEmailSenderPublic) {
    setTestState((prev) => ({ ...prev, [s.id]: { loading: true } }));
    try {
      const res = await fetch(`/api/settings/email-senders/${s.id}/test`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل إرسال البريد التجريبي");
      setTestState((prev) => ({ ...prev, [s.id]: { loading: false, success: true, message: `تم الإرسال بنجاح إلى ${json.sentTo}` } }));
    } catch (e) {
      setTestState((prev) => ({
        ...prev,
        [s.id]: { loading: false, success: false, message: e instanceof Error ? e.message : "فشل إرسال البريد التجريبي" },
      }));
    }
  }

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ fontWeight: 700 }}>عناوين البريد المرسِل</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            بريد SMTP مخصص يُستخدم لإرسال دعوات العملاء بدل بريد Supabase الموحّد
          </p>
        </div>
        <button className="btn btn-gold" onClick={openNew}>
          <Icon name="plus" size={16} /> إضافة بريد جديد
        </button>
      </div>

      {listError && (
        <div className="btn-danger" style={{ width: "100%", justifyContent: "center", cursor: "default" }}>
          {listError}
        </div>
      )}

      {senders === null ? (
        <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
      ) : senders.length === 0 ? (
        <div className="empty-state card">
          <Icon name="mail" size={28} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد عناوين بريد مرسِل بعد — سيُستخدم بريد Supabase الافتراضي عند دعوة العملاء</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
          {senders.map((s) => {
            const t = testState[s.id];
            return (
              <div key={s.id} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 14.5 }}>{s.label}</span>
                      {s.is_default && <span className="chip chip-gold">افتراضي</span>}
                    </div>
                    <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 4 }}>
                      {s.from_name} — {s.from_email}
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, fontFamily: "monospace" }}>
                      {s.smtp_host}:{s.smtp_port} {s.smtp_secure ? "(SSL)" : ""}
                    </div>
                  </div>
                </div>

                {t?.message && (
                  <div
                    style={{
                      fontSize: 11.5,
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: t.success ? "rgba(29,185,84,0.1)" : "rgba(239,68,68,0.1)",
                      color: t.success ? "var(--success)" : "#EF4444",
                    }}
                  >
                    {t.message}
                  </div>
                )}

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="btn btn-outline" style={{ fontSize: 11.5, padding: "6px 10px" }} onClick={() => openEdit(s)}>
                    <Icon name="edit" size={13} /> تعديل
                  </button>
                  {!s.is_default && (
                    <button className="btn btn-outline" style={{ fontSize: 11.5, padding: "6px 10px" }} onClick={() => setDefault(s)}>
                      <Icon name="badgeCheck" size={13} /> تعيين كافتراضي
                    </button>
                  )}
                  <button className="btn btn-outline" style={{ fontSize: 11.5, padding: "6px 10px" }} onClick={() => test(s)} disabled={t?.loading}>
                    <Icon name="send" size={13} /> {t?.loading ? "جارٍ الإرسال..." : "اختبار الإرسال"}
                  </button>
                  <button className="btn-ghost" style={{ fontSize: 11.5, padding: "6px 10px", color: "#EF4444" }} onClick={() => remove(s)}>
                    <Icon name="trash" size={13} /> حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={form.id ? "تعديل بريد الإرسال" : "إضافة بريد إرسال جديد"}
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
          {formError && (
            <div className="btn-danger" style={{ width: "100%", justifyContent: "center", marginBottom: 14, cursor: "default" }}>
              {formError}
            </div>
          )}
          <Field label="الاسم التعريفي">
            <input className="input-field" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="مثال: دعوات العملاء" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="اسم المُرسِل">
              <input className="input-field" value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} placeholder="مثال: فريق TAJ" />
            </Field>
            <Field label="بريد المُرسِل">
              <input className="input-field" type="email" value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} placeholder="invite@company.com" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <Field label="عنوان خادم SMTP">
              <input className="input-field" value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} placeholder="smtp.example.com" />
            </Field>
            <Field label="المنفذ">
              <input className="input-field" type="number" value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: e.target.value })} />
            </Field>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={form.smtpSecure} onChange={(e) => setForm({ ...form, smtpSecure: e.target.checked })} />
            استخدام SSL
          </label>
          <Field label="اسم مستخدم SMTP">
            <input className="input-field" value={form.smtpUsername} onChange={(e) => setForm({ ...form, smtpUsername: e.target.value })} />
          </Field>
          <Field label="كلمة مرور SMTP">
            <input
              className="input-field"
              type="password"
              value={form.smtpPassword}
              onChange={(e) => setForm({ ...form, smtpPassword: e.target.value })}
              placeholder={form.id ? "اتركه فارغاً للإبقاء على كلمة المرور الحالية" : ""}
            />
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            تعيين كافتراضي
          </label>
        </Modal>
      )}
    </div>
  );
}

// ══════════════════ ب. الأرقام المرجعية ══════════════════
// جدول عادي بسياسات RLS بسيطة — يُدار مباشرة عبر عميل Supabase، مطابقاً لنمط
// VendorsClient/BankAccountsClient. لا يوجد أي إرسال SMS/واتساب فعلي هنا.
function SenderNumbersSection({ companyId, initialNumbers }: { companyId: string; initialNumbers: CompanySenderNumber[] }) {
  const supabase = createClient();

  const [numbers, setNumbers] = useState<CompanySenderNumber[]>(initialNumbers);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<NumberForm>(emptyNumberForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNew() {
    setForm(emptyNumberForm);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(n: CompanySenderNumber) {
    setForm({ id: n.id, label: n.label, phone_number: n.phone_number, notes: n.notes ?? "", is_default: n.is_default });
    setError(null);
    setModalOpen(true);
  }

  async function save() {
    if (!form.label.trim() || !form.phone_number.trim()) {
      setError("الاسم التعريفي ورقم الجوال مطلوبان");
      return;
    }
    setSaving(true);
    setError(null);

    if (form.is_default) {
      await supabase.from("company_sender_numbers").update({ is_default: false }).eq("company_id", companyId);
    }

    const payload = {
      company_id: companyId,
      label: form.label.trim(),
      phone_number: form.phone_number.trim(),
      notes: form.notes.trim() || null,
      is_default: form.is_default,
    };

    if (form.id) {
      const { data, error: err } = await supabase.from("company_sender_numbers").update(payload).eq("id", form.id).select("*").single();
      setSaving(false);
      if (err || !data) {
        setError("تعذّر حفظ التعديلات");
        return;
      }
      setNumbers((prev) => prev.map((n) => (n.id === form.id ? (data as CompanySenderNumber) : { ...n, is_default: form.is_default ? false : n.is_default })));
      await logActivity(supabase, { companyId, action: "sender_number_updated", details: { label: payload.label } });
    } else {
      const { data, error: err } = await supabase.from("company_sender_numbers").insert(payload).select("*").single();
      setSaving(false);
      if (err || !data) {
        setError("تعذّر إضافة الرقم المرجعي");
        return;
      }
      setNumbers((prev) => [...(form.is_default ? prev.map((n) => ({ ...n, is_default: false })) : prev), data as CompanySenderNumber]);
      await logActivity(supabase, { companyId, action: "sender_number_created", details: { label: payload.label } });
    }
    setModalOpen(false);
  }

  async function remove(n: CompanySenderNumber) {
    if (!confirm(`حذف الرقم المرجعي "${n.label}"؟`)) return;
    const { error: err } = await supabase.from("company_sender_numbers").delete().eq("id", n.id);
    if (err) return;
    setNumbers((prev) => prev.filter((x) => x.id !== n.id));
    await logActivity(supabase, { companyId, action: "sender_number_deleted", details: { label: n.label } });
  }

  async function setDefault(n: CompanySenderNumber) {
    await supabase.from("company_sender_numbers").update({ is_default: false }).eq("company_id", companyId);
    await supabase.from("company_sender_numbers").update({ is_default: true }).eq("id", n.id);
    setNumbers((prev) => prev.map((x) => ({ ...x, is_default: x.id === n.id })));
  }

  return (
    <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ fontWeight: 700 }}>الأرقام المرجعية</h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            تُستخدم هذه الأرقام كمرجع فقط عند نسخ رابط الدعوة يدوياً — لا يوجد إرسال SMS أو واتساب تلقائي في هذا النظام
          </p>
        </div>
        <button className="btn btn-outline" onClick={openNew}>
          <Icon name="plus" size={16} /> إضافة رقم مرجعي
        </button>
      </div>

      {error && (
        <div className="btn-danger" style={{ width: "100%", justifyContent: "center", cursor: "default" }}>
          {error}
        </div>
      )}

      {numbers.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا توجد أرقام مرجعية بعد</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {numbers.map((n) => (
            <div
              key={n.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                border: "1px solid var(--border)",
                borderRadius: 10,
                flexWrap: "wrap",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 160 }}>
                <Icon name="phone" size={14} className="text-muted" />
                <span style={{ fontWeight: 700, fontSize: 13 }}>{n.label}</span>
                <span style={{ fontSize: 12.5, color: "var(--text-secondary)", fontFamily: "monospace" }}>{n.phone_number}</span>
                {n.is_default && <span className="chip chip-gold">افتراضي</span>}
              </span>
              {n.notes && <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{n.notes}</span>}
              <div style={{ display: "flex", gap: 4 }}>
                {!n.is_default && (
                  <button className="btn-ghost" style={{ padding: "4px 8px", fontSize: 11.5 }} onClick={() => setDefault(n)}>
                    تعيين كافتراضي
                  </button>
                )}
                <button className="btn-ghost" style={{ padding: "4px 6px" }} onClick={() => openEdit(n)} title="تعديل">
                  <Icon name="edit" size={13} />
                </button>
                <button className="btn-ghost" style={{ padding: "4px 6px", color: "#EF4444" }} onClick={() => remove(n)} title="حذف">
                  <Icon name="trash" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={form.id ? "تعديل رقم مرجعي" : "إضافة رقم مرجعي"}
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
          <Field label="الاسم التعريفي">
            <input className="input-field" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="مثال: خط الدعم الرئيسي" />
          </Field>
          <Field label="رقم الجوال">
            <input className="input-field" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="05xxxxxxxx" />
          </Field>
          <Field label="ملاحظات">
            <textarea className="input-field" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ resize: "vertical" }} />
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} />
            تعيين كافتراضي
          </label>
        </Modal>
      )}
    </div>
  );
}
