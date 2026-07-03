"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { CLIENT_PERMISSION_LABELS, DEFAULT_CLIENT_PERMISSIONS } from "@/app/lib/constants";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import {
  CLIENT_ACCESS_TYPES,
  CLIENT_DELIVERY_METHODS,
  CLIENT_INVITE_DURATIONS,
  CLIENT_INVITE_PRESETS,
  CLIENT_INVITE_TYPES,
  CLIENT_PERMISSION_GROUPS,
  detectInviteType,
  permissionCountOf,
  type ClientDeliveryMethod,
  type ClientInviteType,
} from "@/app/lib/client-invite-catalog";
import type { ClientAccessType, ClientInviteDraft, ClientInviteWizardData, ClientPermissions } from "@/app/lib/types";

const STEP_LABELS = ["معلومات العميل", "الصلاحيات", "المراجعة والإرسال"];
const ALL_PERM_KEYS = Object.keys(CLIENT_PERMISSION_LABELS) as (keyof ClientPermissions)[];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ClientInviteModal({
  projectId,
  draft,
  onClose,
  onInvited,
  onDraftSaved,
}: {
  projectId: string;
  onClose: () => void;
  onInvited: () => void;
  draft?: ClientInviteDraft;
  onDraftSaved?: () => void;
}) {
  const supabase = createClient();
  const { userId, company } = useSession();
  const companyId = company!.id;

  const [step, setStep] = useState(1);
  const [touched, setTouched] = useState(false);

  // ── الخطوة 1: معلومات العميل ──
  const [name, setName] = useState(() => draft?.client_name ?? "");
  const [email, setEmail] = useState(() => draft?.email ?? "");
  const [phone, setPhone] = useState(() => draft?.data.phone ?? "");
  const [jobTitle, setJobTitle] = useState(() => draft?.data.jobTitle ?? "");
  const [clientCompanyName, setClientCompanyName] = useState(() => draft?.data.clientCompanyName ?? "");
  const [inviteType, setInviteType] = useState<ClientInviteType>(() => draft?.data.inviteType ?? "client");

  // ── الخطوة 2: الصلاحيات (مشتركة مع بطاقات الخطوة 1) ──
  const [permissions, setPermissions] = useState<ClientPermissions>(() => draft?.data.permissions ?? { ...DEFAULT_CLIENT_PERMISSIONS });
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // ── الخطوة 3: إعدادات الدعوة ──
  const [durationDays, setDurationDays] = useState<number | null>(() => draft?.data.durationDays ?? 30);
  const [accessType, setAccessType] = useState<ClientAccessType>(() => draft?.data.accessType ?? "unlimited");
  const [untilDate, setUntilDate] = useState(() => draft?.data.expiresAt?.slice(0, 10) ?? "");
  const [deliveryMethod, setDeliveryMethod] = useState<ClientDeliveryMethod>(() => draft?.data.deliveryMethod ?? "email");

  // ── حالة الإرسال/الحفظ ──
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentLink, setSentLink] = useState<string | null | undefined>(undefined); // undefined = لم يُرسل بعد
  const [copied, setCopied] = useState(false);

  const canNext1 = name.trim() !== "" && email.trim() !== "";
  const hasUnsavedInput = Boolean(name.trim() || email.trim() || phone.trim() || jobTitle.trim() || clientCompanyName.trim());

  // تُطبَّق على أي تغيير في الصلاحيات (سواء من بطاقات نوع الدعوة، أزرار الأدوات
  // السريعة، أو تبديل صلاحية فردية) — تُعيد اشتقاق نوع الدعوة تلقائياً كي تبقى
  // بطاقة الخطوة 1 متزامنة بصرياً مع الصلاحيات الفعلية المختارة دوماً.
  function applyPermissions(next: ClientPermissions) {
    setPermissions(next);
    setInviteType(detectInviteType(next));
  }

  function selectInviteType(type: ClientInviteType) {
    if (type === "custom") {
      setInviteType("custom");
      return;
    }
    applyPermissions(CLIENT_INVITE_PRESETS[type]);
  }

  function togglePerm(key: keyof ClientPermissions) {
    applyPermissions({ ...permissions, [key]: !permissions[key] });
  }

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  // دالة (وليست قيمة محسوبة أثناء الرندر) لأنها تعتمد على Date.now() — يُستدعى فقط
  // عند الحفظ/الإرسال الفعليين، لا في مسار الرندر النقي (الملخص الحي يعرض المدة
  // المختارة كما هي دون حساب الفارق الزمني الآن).
  function computeEffectiveDurationDays(): number | null {
    if (accessType === "until_date" && untilDate) {
      return Math.max(1, Math.ceil((new Date(untilDate).getTime() - Date.now()) / 86400000));
    }
    return durationDays;
  }

  function buildWizardData(): ClientInviteWizardData {
    const effectiveDurationDays = computeEffectiveDurationDays();
    const expiresAt =
      accessType === "until_date" && untilDate
        ? new Date(untilDate).toISOString()
        : effectiveDurationDays
          ? new Date(Date.now() + effectiveDurationDays * 86400000).toISOString()
          : null;
    return {
      phone: phone.trim() || undefined,
      jobTitle: jobTitle.trim() || undefined,
      clientCompanyName: clientCompanyName.trim() || undefined,
      inviteType,
      permissions,
      durationDays: effectiveDurationDays,
      accessType,
      expiresAt,
      deliveryMethod,
    };
  }

  function requestClose() {
    if (sentLink !== undefined) {
      onClose();
      return;
    }
    if (hasUnsavedInput && !confirm("سيتم تجاهل البيانات غير المحفوظة. إغلاق النافذة؟")) return;
    onClose();
  }

  function goNext() {
    setTouched(true);
    if (step === 1 && !canNext1) return;
    setTouched(false);
    setStep((s) => Math.min(3, s + 1));
  }

  function goBack() {
    setTouched(false);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSaveDraft() {
    setTouched(true);
    if (!canNext1) {
      setError("الاسم والبريد الإلكتروني مطلوبان لحفظ المسودة");
      return;
    }
    setSavingDraft(true);
    setError(null);
    try {
      const row = {
        company_id: companyId,
        project_id: projectId,
        created_by: userId,
        client_name: name.trim(),
        email: email.trim(),
        data: buildWizardData(),
      };
      if (draft) {
        await supabase.from("client_invite_drafts").upsert({ id: draft.id, ...row }, { onConflict: "id" });
      } else {
        await supabase.from("client_invite_drafts").insert(row);
      }
      onDraftSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر حفظ المسودة");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleSend() {
    setTouched(true);
    if (!canNext1) {
      setStep(1);
      setError("الاسم والبريد الإلكتروني مطلوبان");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/invites/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          email: email.trim(),
          clientName: name.trim(),
          phone: phone.trim() || undefined,
          jobTitle: jobTitle.trim() || undefined,
          clientCompanyName: clientCompanyName.trim() || undefined,
          permissions,
          deliveryMethod,
          durationDays: computeEffectiveDurationDays(),
          accessType,
        }),
      });
      // استجابة فارغة/غير JSON (مثل انقطاع الخادم قبل إرسال أي رد) تُعامَل برسالة واضحة
      // بدل ترك JSON.parse يرمي خطأ تقني غير مفهوم للمستخدم ("Unexpected end of JSON input")
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(json.error || "تعذّرت الدعوة");

      if (draft) {
        await supabase.from("client_invite_drafts").delete().eq("id", draft.id);
      }
      onInvited();

      if (deliveryMethod === "link") {
        setSentLink((json.inviteLink as string | null) ?? null);
      } else {
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّرت الدعوة");
    } finally {
      setSaving(false);
    }
  }

  function copyLink() {
    if (!sentLink) return;
    navigator.clipboard.writeText(sentLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const busy = saving || savingDraft;
  const selectedCount = permissionCountOf(permissions);

  return (
    <div className="modal-overlay" onClick={() => !busy && requestClose()}>
      <div
        className="modal-content"
        style={{ maxWidth: 1040, padding: 0, display: "flex", flexDirection: "column", maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 24px 0" }}>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>دعوة عميل جديد</h2>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>معالج من 3 خطوات لضبط وصول العميل للمشروع</p>
          </div>
          <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={requestClose} disabled={busy}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {sentLink === undefined && (
          <div style={{ padding: "18px 24px 0" }}>
            <StepIndicator step={step} />
          </div>
        )}

        <div style={{ display: "flex", flex: 1, minHeight: 0, marginTop: 18 }}>
          {/* لوحة الملخص الحي — تظهر يمينًا طوال الخطوات الثلاث (dir=rtl) */}
          <div
            style={{
              flex: "0 0 38%",
              background: "var(--bg-secondary)",
              borderInlineStart: "1px solid var(--border)",
              padding: 22,
              overflowY: "auto",
            }}
          >
            <SummaryPanel
              name={name}
              email={email}
              phone={phone}
              jobTitle={jobTitle}
              permissions={permissions}
              selectedCount={selectedCount}
              durationDays={durationDays}
              accessType={accessType}
              untilDate={untilDate}
              deliveryMethod={deliveryMethod}
            />
          </div>

          {/* محتوى الخطوة الحالية */}
          <div style={{ flex: "1 1 62%", padding: "0 24px 4px", overflowY: "auto" }}>
            {error && (
              <div className="btn-danger" style={{ display: "block", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                {error}
              </div>
            )}

            {sentLink !== undefined ? (
              <SendSuccessView deliveryMethod={deliveryMethod} link={sentLink} copied={copied} onCopy={copyLink} />
            ) : (
              <>
                {step === 1 && (
                  <Step1
                    name={name}
                    setName={setName}
                    email={email}
                    setEmail={setEmail}
                    phone={phone}
                    setPhone={setPhone}
                    jobTitle={jobTitle}
                    setJobTitle={setJobTitle}
                    clientCompanyName={clientCompanyName}
                    setClientCompanyName={setClientCompanyName}
                    inviteType={inviteType}
                    onSelectType={selectInviteType}
                    touched={touched}
                    canNext1={canNext1}
                  />
                )}
                {step === 2 && (
                  <Step2
                    permissions={permissions}
                    applyPermissions={applyPermissions}
                    togglePerm={togglePerm}
                    collapsedGroups={collapsedGroups}
                    toggleGroup={toggleGroup}
                  />
                )}
                {step === 3 && (
                  <Step3
                    durationDays={durationDays}
                    setDurationDays={setDurationDays}
                    accessType={accessType}
                    setAccessType={setAccessType}
                    untilDate={untilDate}
                    setUntilDate={setUntilDate}
                    deliveryMethod={deliveryMethod}
                    setDeliveryMethod={setDeliveryMethod}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* شريط الإجراءات */}
        {sentLink === undefined && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "16px 24px 22px", borderTop: "1px solid var(--border)", marginTop: 10 }}>
            <button type="button" className="btn btn-ghost" onClick={requestClose} disabled={busy}>
              إلغاء
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn btn-outline" onClick={handleSaveDraft} disabled={busy}>
                {savingDraft ? "جارٍ الحفظ..." : "حفظ كمسودة"}
              </button>
              {step > 1 && (
                <button type="button" className="btn btn-outline" onClick={goBack} disabled={busy}>
                  <Icon name="arrowRight" size={16} /> السابق
                </button>
              )}
              {step < 3 ? (
                <button type="button" className="btn btn-gold" onClick={goNext} disabled={busy}>
                  التالي <Icon name="arrowLeft" size={16} />
                </button>
              ) : (
                <button type="button" className="btn btn-gold" onClick={handleSend} disabled={busy}>
                  {saving ? "جارٍ الإرسال..." : "إرسال الدعوة"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < STEP_LABELS.length - 1 ? 1 : "0 0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                  background: active || done ? "var(--gold)" : "var(--bg-hover)",
                  color: active || done ? "#0A0A0B" : "var(--text-muted)",
                  border: active || done ? "none" : "1px solid var(--border)",
                }}
              >
                {done ? <Icon name="check" size={13} /> : n}
              </span>
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "var(--gold)" : done ? "var(--text-primary)" : "var(--text-muted)", whiteSpace: "nowrap" }}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && <div style={{ flex: 1, height: 2, background: done ? "var(--gold)" : "var(--border)", margin: "0 12px" }} />}
          </div>
        );
      })}
    </div>
  );
}

function Step1({
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  jobTitle,
  setJobTitle,
  clientCompanyName,
  setClientCompanyName,
  inviteType,
  onSelectType,
  touched,
  canNext1,
}: {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  jobTitle: string;
  setJobTitle: (v: string) => void;
  clientCompanyName: string;
  setClientCompanyName: (v: string) => void;
  inviteType: ClientInviteType;
  onSelectType: (t: ClientInviteType) => void;
  touched: boolean;
  canNext1: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="اسم العميل *">
        <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أحمد المالكي" autoFocus />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="البريد الإلكتروني *">
          <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        </Field>
        <Field label="رقم الجوال">
          <input className="input-field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="المنصب / المسمى الوظيفي">
          <input className="input-field" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="مدير تسويق" />
        </Field>
        <Field label="اسم الشركة">
          <input className="input-field" value={clientCompanyName} onChange={(e) => setClientCompanyName(e.target.value)} placeholder="اسم شركة العميل" />
        </Field>
      </div>
      {touched && !canNext1 && <p style={{ fontSize: 12, color: "var(--danger)" }}>الاسم والبريد الإلكتروني مطلوبان للمتابعة</p>}

      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>نوع الدعوة</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {CLIENT_INVITE_TYPES.map((t) => {
            const active = inviteType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                className="card"
                onClick={() => onSelectType(t.value)}
                style={{
                  padding: 14,
                  cursor: "pointer",
                  textAlign: "right",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  borderColor: active ? "var(--gold)" : "var(--border)",
                  background: active ? "rgba(var(--gold-rgb),0.08)" : "var(--bg-card)",
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: active ? "var(--gold)" : "rgba(var(--gold-rgb),0.12)",
                    color: active ? "#0A0A0B" : "var(--gold)",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={t.icon} size={15} />
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? "var(--gold)" : "var(--text-primary)" }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{t.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Step2({
  permissions,
  applyPermissions,
  togglePerm,
  collapsedGroups,
  toggleGroup,
}: {
  permissions: ClientPermissions;
  applyPermissions: (p: ClientPermissions) => void;
  togglePerm: (key: keyof ClientPermissions) => void;
  collapsedGroups: Record<string, boolean>;
  toggleGroup: (key: string) => void;
}) {
  function selectAll() {
    const next = {} as ClientPermissions;
    for (const k of ALL_PERM_KEYS) next[k] = true;
    applyPermissions(next);
  }
  function clearAll() {
    const next = {} as ClientPermissions;
    for (const k of ALL_PERM_KEYS) next[k] = false;
    applyPermissions(next);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="chip" style={{ cursor: "pointer" }} onClick={selectAll}>
          <Icon name="check" size={12} /> تحديد الكل
        </button>
        <button type="button" className="chip" style={{ cursor: "pointer" }} onClick={clearAll}>
          <Icon name="close" size={12} /> إلغاء الكل
        </button>
        {CLIENT_INVITE_TYPES.filter((t) => t.value !== "custom").map((t) => (
          <button
            key={t.value}
            type="button"
            className="chip chip-gold"
            style={{ cursor: "pointer" }}
            onClick={() => applyPermissions(CLIENT_INVITE_PRESETS[t.value as Exclude<ClientInviteType, "custom">])}
          >
            <Icon name={t.icon} size={12} /> {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {CLIENT_PERMISSION_GROUPS.map((group) => {
          const count = group.keys.filter((k) => permissions[k]).length;
          const collapsed = Boolean(collapsedGroups[group.key]);
          return (
            <div key={group.key} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  cursor: "pointer",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-primary)",
                  textAlign: "right",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon name={group.icon} size={16} className="text-muted" />
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{group.label}</span>
                  <span className="chip" style={{ fontSize: 11 }}>
                    {count} صلاحية
                  </span>
                </span>
                <Icon name="chevronDown" size={16} className={collapsed ? "" : "rotate-180"} />
              </button>
              {!collapsed && (
                <div style={{ padding: "4px 14px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  {group.keys.map((key) => (
                    <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer", padding: "4px 0" }}>
                      <input type="checkbox" checked={permissions[key]} onChange={() => togglePerm(key)} />
                      {CLIENT_PERMISSION_LABELS[key]}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step3({
  durationDays,
  setDurationDays,
  accessType,
  setAccessType,
  untilDate,
  setUntilDate,
  deliveryMethod,
  setDeliveryMethod,
}: {
  durationDays: number | null;
  setDurationDays: (v: number | null) => void;
  accessType: ClientAccessType;
  setAccessType: (v: ClientAccessType) => void;
  untilDate: string;
  setUntilDate: (v: string) => void;
  deliveryMethod: ClientDeliveryMethod;
  setDeliveryMethod: (v: ClientDeliveryMethod) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="مدة الدعوة">
          <select
            className="input-field"
            value={durationDays === null ? "null" : String(durationDays)}
            onChange={(e) => setDurationDays(e.target.value === "null" ? null : Number(e.target.value))}
          >
            {CLIENT_INVITE_DURATIONS.map((d) => (
              <option key={d.label} value={d.value === null ? "null" : String(d.value)}>
                {d.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="صلاحية الوصول">
          <select className="input-field" value={accessType} onChange={(e) => setAccessType(e.target.value as ClientAccessType)}>
            {CLIENT_ACCESS_TYPES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {accessType === "until_date" && (
        <Field label="تاريخ انتهاء الوصول">
          <input type="date" className="input-field" value={untilDate} onChange={(e) => setUntilDate(e.target.value)} />
        </Field>
      )}

      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>إرسال عبر</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {CLIENT_DELIVERY_METHODS.map((m) => {
            const active = deliveryMethod === m.value;
            return (
              <button
                key={m.value}
                type="button"
                className="card"
                onClick={() => setDeliveryMethod(m.value)}
                style={{
                  padding: 14,
                  cursor: "pointer",
                  textAlign: "right",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  borderColor: active ? "var(--gold)" : "var(--border)",
                  background: active ? "rgba(var(--gold-rgb),0.08)" : "var(--bg-card)",
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: active ? "var(--gold)" : "rgba(var(--gold-rgb),0.12)",
                    color: active ? "#0A0A0B" : "var(--gold)",
                  }}
                >
                  <Icon name={m.icon} size={15} />
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: active ? "var(--gold)" : "var(--text-primary)" }}>{m.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{m.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryPanel({
  name,
  email,
  phone,
  jobTitle,
  permissions,
  selectedCount,
  durationDays,
  accessType,
  untilDate,
  deliveryMethod,
}: {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  permissions: ClientPermissions;
  selectedCount: number;
  durationDays: number | null;
  accessType: ClientAccessType;
  untilDate: string;
  deliveryMethod: ClientDeliveryMethod;
}) {
  const groupCounts = CLIENT_PERMISSION_GROUPS.map((g) => ({
    group: g,
    count: g.keys.filter((k) => permissions[k]).length,
  })).filter((g) => g.count > 0);

  const durationLabel =
    accessType === "until_date" && untilDate
      ? `حتى ${new Date(untilDate).toLocaleDateString("ar-SA")}`
      : CLIENT_INVITE_DURATIONS.find((d) => d.value === durationDays)?.label ?? "—";
  const accessLabel = CLIENT_ACCESS_TYPES.find((a) => a.value === accessType)?.label ?? "—";
  const deliveryText = deliveryMethod === "email" ? "سيتم إرسال إشعار بالبريد الإلكتروني فور إرسال الدعوة" : "سيتم إنشاء رابط دعوة لنسخه وإرساله يدوياً عبر أي قناة";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>ملخص الدعوة</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: "50%",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(var(--gold-rgb),0.15)",
              color: "var(--gold)",
              fontWeight: 800,
              fontSize: 16,
            }}
          >
            {initialsOf(name || "؟")}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name.trim() || "بدون اسم"}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{jobTitle.trim() || "—"}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12, fontSize: 12.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
            <Icon name="mail" size={13} className="text-muted" />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.trim() || "—"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
            <Icon name="phone" size={13} className="text-muted" />
            <span>{phone.trim() || "—"}</span>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-secondary)" }}>الصلاحيات المختارة</span>
          <span className="chip chip-gold">{selectedCount} صلاحية</span>
        </div>
        {groupCounts.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>لم تُحدَّد أي صلاحيات بعد</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {groupCounts.map(({ group, count }) => (
              <div key={group.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-secondary)" }}>
                <Icon name={group.icon} size={13} className="text-muted" />
                <span>
                  {count} صلاحيات — {group.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>إعدادات الدعوة</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
          <SummaryRow label="مدة الدعوة" value={durationLabel} />
          <SummaryRow label="صلاحية الوصول" value={accessLabel} />
          <div style={{ color: "var(--text-muted)", fontSize: 11.5, marginTop: 2 }}>{deliveryText}</div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          background: "rgba(29,185,84,0.1)",
          border: "1px solid rgba(29,185,84,0.3)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <span style={{ color: "var(--success)", flexShrink: 0, display: "flex" }}>
          <Icon name="shield" size={16} />
        </span>
        <p style={{ fontSize: 11.5, color: "var(--success)", lineHeight: 1.6 }}>
          الدعوة آمنة ومحدودة — سيتمكن العميل فقط من الوصول للصلاحيات المحددة ولا يمكنه تغيير أي إعدادات للنظام
        </p>
      </div>
    </div>
  );
}

function SendSuccessView({ deliveryMethod, link, copied, onCopy }: { deliveryMethod: ClientDeliveryMethod; link: string | null; copied: boolean; onCopy: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center", padding: "40px 10px" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(29,185,84,0.12)",
          color: "var(--success)",
        }}
      >
        <Icon name="check" size={26} />
      </div>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 800 }}>تم إرسال الدعوة بنجاح</h3>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
          {deliveryMethod === "link" ? "انسخ الرابط أدناه وأرسله للعميل عبر أي قناة" : "تم إرسال بريد إلكتروني للعميل بتفاصيل الدخول"}
        </p>
      </div>
      {deliveryMethod === "link" && link && (
        <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 420 }}>
          <input className="input-field" readOnly value={link} style={{ fontSize: 12, textAlign: "left", direction: "ltr" }} />
          <button type="button" className="btn btn-gold" style={{ flexShrink: 0 }} onClick={onCopy}>
            <Icon name={copied ? "check" : "copy"} size={14} /> {copied ? "تم النسخ" : "نسخ"}
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</label>
      {children}
      {error && <p style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 5 }}>{error}</p>}
    </div>
  );
}
