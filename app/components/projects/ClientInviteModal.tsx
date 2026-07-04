"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import ClientPermissionsEditor from "./ClientPermissionsEditor";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { CLIENT_INVITE_PRESETS, CLIENT_INVITE_TYPES, detectInviteType, type ClientInviteType } from "@/app/lib/client-invite-catalog";
import type { ClientInviteDraft, ClientInviteWizardData, ClientPermissions } from "@/app/lib/types";

type ContactMethod = "email" | "phone";

interface SendResult {
  accountCreated: boolean;
  linkedExisting: boolean;
  loginLink: string;
  tempPassword: string | null;
  emailSent: boolean;
  whatsappLink: string | null;
  inviteMessage: string;
  email: string;
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

  const [view, setView] = useState<"new" | "manage">("new");
  const [projectName, setProjectName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .single()
      .then(({ data }) => {
        if (!cancelled) setProjectName((data as { name: string } | null)?.name ?? null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- يُجلب مرة واحدة فقط لكل مشروع تُفتح نافذته
  }, [projectId]);

  const [contactMethod, setContactMethod] = useState<ContactMethod>(() => (draft?.data.deliveryMethod === "whatsapp" ? "phone" : "email"));
  const [email, setEmail] = useState(() => draft?.email ?? "");
  const [phone, setPhone] = useState(() => draft?.data.phone ?? "");
  const [clientName, setClientName] = useState(() => draft?.client_name ?? "");
  const [clientCompanyName, setClientCompanyName] = useState(() => draft?.data.clientCompanyName ?? "");
  const [customMessage, setCustomMessage] = useState("");

  const [permissions, setPermissions] = useState<ClientPermissions>(() => draft?.data.permissions ?? { ...CLIENT_INVITE_PRESETS.regular });
  const [activePreset, setActivePreset] = useState<ClientInviteType>(() => draft?.data.inviteType ?? "regular");
  const [showCustom, setShowCustom] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [copied, setCopied] = useState<"" | "password" | "message" | "email">("");

  const canSend = clientName.trim() !== "" && email.trim() !== "" && (contactMethod === "email" || phone.trim() !== "");
  const hasUnsavedInput = Boolean(clientName.trim() || email.trim() || phone.trim() || clientCompanyName.trim());
  const [touched, setTouched] = useState(false);

  function applyPermissions(next: ClientPermissions) {
    setPermissions(next);
    setActivePreset(detectInviteType(next));
  }

  function selectPreset(type: ClientInviteType) {
    if (type === "custom") {
      setActivePreset("custom");
      setShowCustom(true);
      return;
    }
    applyPermissions(CLIENT_INVITE_PRESETS[type]);
    setShowCustom(false);
  }

  function buildWizardData(): ClientInviteWizardData {
    return {
      phone: phone.trim() || undefined,
      clientCompanyName: clientCompanyName.trim() || undefined,
      inviteType: activePreset,
      permissions,
      durationDays: null,
      accessType: "unlimited",
      deliveryMethod: contactMethod === "phone" ? "whatsapp" : "email",
      senderId: null,
      senderNumberId: null,
    };
  }

  function requestClose() {
    if (result) {
      onClose();
      return;
    }
    if (hasUnsavedInput && !confirm("سيتم تجاهل البيانات غير المحفوظة. إغلاق النافذة؟")) return;
    onClose();
  }

  async function handleSaveDraft() {
    setTouched(true);
    if (!canSend) {
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
        client_name: clientName.trim(),
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
    if (!canSend) {
      setError(contactMethod === "phone" ? "الاسم والبريد ورقم الجوال مطلوبة" : "الاسم والبريد الإلكتروني مطلوبان");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/invitations/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          email: email.trim(),
          clientName: clientName.trim(),
          phone: phone.trim() || undefined,
          clientCompanyName: clientCompanyName.trim() || undefined,
          customMessage: customMessage.trim() || undefined,
          permissions,
          deliveryMethod: contactMethod === "phone" ? "whatsapp" : "email",
        }),
      });
      const text = await res.text();
      const json = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(json.error || "تعذّرت الدعوة");

      if (draft) {
        await supabase.from("client_invite_drafts").delete().eq("id", draft.id);
      }
      onInvited();
      setResult({
        accountCreated: Boolean(json.accountCreated),
        linkedExisting: Boolean(json.linkedExisting),
        loginLink: json.loginLink,
        tempPassword: (json.tempPassword as string | null) ?? null,
        emailSent: Boolean(json.emailSent),
        whatsappLink: (json.whatsappLink as string | null) ?? null,
        inviteMessage: json.inviteMessage as string,
        email: email.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّرت الدعوة");
    } finally {
      setSaving(false);
    }
  }

  function copyText(text: string, key: "password" | "message" | "email") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1800);
    });
  }

  function resetForAnotherInvite() {
    setClientName("");
    setEmail("");
    setPhone("");
    setClientCompanyName("");
    setCustomMessage("");
    setActivePreset("regular");
    setPermissions({ ...CLIENT_INVITE_PRESETS.regular });
    setResult(null);
    setError(null);
    setTouched(false);
  }

  const busy = saving || savingDraft;

  return (
    <div className="modal-overlay" onClick={() => !busy && requestClose()}>
      <div className="modal-content" style={{ maxWidth: 560, display: "flex", flexDirection: "column", maxHeight: "92vh" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "22px 24px 0" }}>
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 800 }}>
              <Icon name="userPlus" size={17} className="text-muted" /> دعوة عميل لهذا المشروع
            </h2>
            <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 6 }}>
              {projectName ? `العميل سيرى فقط مشروع "${projectName}" — ولا يستطيع رؤية أي مشروع آخر.` : "دعوة سريعة لضبط وصول العميل للمشروع"}
            </p>
          </div>
          <button className="btn-ghost" style={{ padding: 6, borderRadius: 8, flexShrink: 0 }} onClick={requestClose} disabled={busy}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 4, padding: "14px 24px 0", borderBottom: "1px solid var(--border)" }}>
          {(
            [
              { key: "new" as const, label: "دعوة جديدة" },
              { key: "manage" as const, label: "إدارة الدعوات" },
            ] satisfies { key: "new" | "manage"; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setView(t.key)}
              className="btn-ghost"
              style={{
                padding: "8px 14px",
                borderRadius: 0,
                borderBottom: view === t.key ? "2px solid var(--gold)" : "2px solid transparent",
                color: view === t.key ? "var(--gold)" : "var(--text-secondary)",
                fontWeight: view === t.key ? 700 : 500,
                fontSize: 13.5,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "20px 24px 24px", overflowY: "auto", flex: 1, minHeight: 0 }}>
          {view === "manage" ? (
            <ManageInvitationsTab projectId={projectId} />
          ) : result ? (
            <ResultView result={result} projectName={projectName} copied={copied} onCopy={copyText} onReset={resetForAnotherInvite} onDone={onClose} />
          ) : (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button type="button" onClick={() => setContactMethod("email")} style={methodBtnStyle(contactMethod === "email")}>
                  <Icon name="mail" size={14} /> البريد الإلكتروني
                </button>
                <button type="button" onClick={() => setContactMethod("phone")} style={methodBtnStyle(contactMethod === "phone")}>
                  <Icon name="phone" size={14} /> رقم الجوال
                </button>
              </div>

              <Field label="بريد العميل الإلكتروني *">
                <input className="input-field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" autoFocus />
              </Field>

              {contactMethod === "phone" && (
                <Field label="رقم جوال العميل *">
                  <input className="input-field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" style={{ direction: "ltr", textAlign: "right" }} />
                </Field>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <Field label="اسم العميل *">
                  <input className="input-field" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="مثال: أحمد المالكي" />
                </Field>
                <Field label="اسم الشركة (اختياري)">
                  <input className="input-field" value={clientCompanyName} onChange={(e) => setClientCompanyName(e.target.value)} />
                </Field>
              </div>

              {contactMethod === "email" && (
                <Field label="رقم الجوال (اختياري — لتفعيل زر إرسال واتساب)">
                  <input className="input-field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" style={{ direction: "ltr", textAlign: "right" }} />
                </Field>
              )}

              <Field label="رسالة مخصصة (اختياري)">
                <textarea className="input-field" rows={2} value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} style={{ resize: "vertical" }} />
              </Field>

              {touched && !canSend && <p style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>الحقول المميزة بـ * مطلوبة للمتابعة</p>}

              <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", margin: "14px 0 8px", fontWeight: 600 }}>قالب الصلاحيات</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: showCustom ? 12 : 18 }}>
                {CLIENT_INVITE_TYPES.map((t) => (
                  <button key={t.value} type="button" onClick={() => selectPreset(t.value)} style={presetBtnStyle(activePreset === t.value)}>
                    {t.value === "custom" && (
                      <span style={{ display: "inline-flex", marginInlineEnd: 4, verticalAlign: "middle" }}>
                        <Icon name="settings" size={13} />
                      </span>
                    )}
                    {t.label}
                  </button>
                ))}
              </div>

              {activePreset !== "custom" && (
                <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 18, lineHeight: 1.6 }}>
                  {CLIENT_INVITE_TYPES.find((t) => t.value === activePreset)?.description}
                </div>
              )}

              {activePreset === "custom" && (
                <div style={{ border: "1px solid var(--border)", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
                  <button
                    type="button"
                    onClick={() => setShowCustom((o) => !o)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      padding: "11px 14px",
                      background: "var(--bg-secondary)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Icon name="settings" size={14} className="text-muted" /> تخصيص الصلاحيات التفصيلية
                    </span>
                    <Icon name="chevronDown" size={15} className={showCustom ? "rotate-180" : ""} />
                  </button>

                  {showCustom && (
                    <div style={{ padding: "12px 14px" }}>
                      <ClientPermissionsEditor companyId={companyId} permissions={permissions} onChange={applyPermissions} />
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="btn-danger" style={{ display: "block", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-outline" onClick={requestClose} disabled={busy}>
                  إلغاء
                </button>
                <button type="button" className="btn btn-outline" onClick={handleSaveDraft} disabled={busy}>
                  {savingDraft ? "جارٍ الحفظ..." : "حفظ كمسودة"}
                </button>
                <button type="button" className="btn btn-gold" onClick={handleSend} disabled={busy}>
                  {saving ? "جارٍ الإرسال..." : "إنشاء الدعوة"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultView({
  result,
  projectName,
  copied,
  onCopy,
  onReset,
  onDone,
}: {
  result: SendResult;
  projectName: string | null;
  copied: "" | "password" | "message" | "email";
  onCopy: (text: string, key: "password" | "message" | "email") => void;
  onReset: () => void;
  onDone: () => void;
}) {
  return (
    <div style={{ padding: "4px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: result.accountCreated ? "rgba(29,185,84,0.15)" : "rgba(59,130,246,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 12px",
          }}
        >
          <span style={{ color: result.accountCreated ? "var(--success)" : "#3987e5", display: "flex" }}>
            <Icon name="checkCircle" size={32} />
          </span>
        </div>
        <p style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
          {result.accountCreated ? "تم إنشاء حساب العميل بنجاح ✓" : result.linkedExisting ? "تم ربط المشروع بحساب العميل ✓" : "تم إنشاء الدعوة ✓"}
        </p>
        {projectName && <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>المشروع: {projectName}</p>}
      </div>

      {result.tempPassword && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: result.emailSent ? "rgba(29,185,84,0.1)" : "rgba(234,179,8,0.1)",
                border: `1px solid ${result.emailSent ? "rgba(29,185,84,0.3)" : "rgba(234,179,8,0.3)"}`,
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <span style={{ color: result.emailSent ? "var(--success)" : "#eab308", display: "flex", flexShrink: 0 }}>
                <Icon name={result.emailSent ? "checkCircle" : "warning"} size={16} />
              </span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: result.emailSent ? "var(--success)" : "#eab308" }}>
                  {result.emailSent ? "تم إرسال البريد ✓" : "لم يُرسَل البريد تلقائياً"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                  {result.emailSent ? result.email : "انسخ الرسالة أدناه وأرسلها يدوياً"}
                </div>
              </div>
            </div>
            <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", fontSize: 11, color: "#3987e5", lineHeight: 1.6 }}>
              ⚠️ كلمة المرور المؤقتة تظهر مرة واحدة فقط — انسخها أو شارك الرسالة الآن.
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="mail" size={13} /> رسالة الدعوة الجاهزة
            </div>
            <textarea
              readOnly
              value={result.inviteMessage}
              style={{
                width: "100%",
                minHeight: 140,
                maxHeight: 200,
                resize: "none",
                fontSize: 12,
                lineHeight: 1.9,
                padding: 12,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontFamily: "monospace",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: result.whatsappLink ? "1fr 1fr" : "1fr", gap: 8, marginBottom: 14 }}>
            <button type="button" className="btn btn-gold" style={{ fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} onClick={() => onCopy(result.inviteMessage, "message")}>
              <Icon name="copy" size={13} /> {copied === "message" ? "تم النسخ ✓" : "نسخ الرسالة كاملة"}
            </button>
            {result.whatsappLink && (
              <a
                href={result.whatsappLink}
                target="_blank"
                rel="noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderRadius: 8, background: "#25D366", color: "#fff", fontWeight: 700, fontSize: 12, textDecoration: "none" }}
              >
                <Icon name="phone" size={13} /> إرسال واتساب
              </a>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <CredentialRow label="البريد" value={result.email} onCopy={() => onCopy(result.email, "email")} copied={copied === "email"} />
            <CredentialRow label="كلمة المرور" value={result.tempPassword} onCopy={() => onCopy(result.tempPassword!, "password")} copied={copied === "password"} mono />
          </div>
        </>
      )}

      {!result.tempPassword && (
        <div style={{ marginBottom: 14 }}>
          {result.linkedExisting && (
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.7, padding: "10px 12px", background: "var(--bg-secondary)", borderRadius: 8, marginBottom: 10 }}>
              العميل لديه حساب مسبقاً — يكفي إعلامه بأن مشروعاً جديداً أُضيف لحسابه.
            </div>
          )}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="mail" size={13} /> رسالة جاهزة
            </div>
            <textarea
              readOnly
              value={result.inviteMessage}
              style={{
                width: "100%",
                minHeight: 100,
                maxHeight: 160,
                resize: "none",
                fontSize: 12,
                lineHeight: 1.9,
                padding: 12,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontFamily: "monospace",
              }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: result.whatsappLink ? "1fr 1fr" : "1fr", gap: 8 }}>
            <button type="button" className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => onCopy(result.inviteMessage, "message")}>
              {copied === "message" ? "تم النسخ ✓" : "نسخ الرسالة"}
            </button>
            {result.whatsappLink && (
              <a
                href={result.whatsappLink}
                target="_blank"
                rel="noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 8, background: "#25D366", color: "#fff", fontWeight: 700, fontSize: 12, textDecoration: "none", padding: "10px 0" }}
              >
                <Icon name="phone" size={13} /> واتساب
              </a>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button type="button" className="btn btn-outline" style={{ flex: 1, fontSize: 12 }} onClick={onReset}>
          + دعوة عميل آخر
        </button>
        <button type="button" className="btn btn-gold" style={{ flex: 1 }} onClick={onDone}>
          تم
        </button>
      </div>
    </div>
  );
}

function CredentialRow({ label, value, onCopy, copied, mono }: { label: string; value: string; onCopy: () => void; copied: boolean; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ display: "flex", gap: 6, background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px" }}>
        <span
          style={{
            flex: 1,
            color: "var(--text-primary)",
            fontSize: mono ? 13.5 : 12,
            fontWeight: mono ? 800 : 400,
            direction: "ltr",
            textAlign: "left",
            letterSpacing: mono ? 1 : "normal",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </span>
        <button type="button" onClick={onCopy} className="btn-ghost" style={{ padding: "0 8px", flexShrink: 0 }} title="نسخ">
          <Icon name={copied ? "check" : "copy"} size={13} />
        </button>
      </div>
    </div>
  );
}

const INVITATION_STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الإرسال", color: "#F59E0B" },
  sent: { label: "أُرسلت", color: "#3987e5" },
  opened: { label: "فُتحت", color: "#8B93A1" },
  accepted: { label: "قُبلت", color: "#1DB954" },
  failed: { label: "فشلت", color: "#EF4444" },
  expired: { label: "منتهية", color: "#F59E0B" },
  cancelled: { label: "ملغاة", color: "#6B7280" },
};

const INVITATION_METHOD_LABELS: Record<string, string> = {
  email: "البريد الإلكتروني",
  link: "رابط",
  whatsapp: "واتساب",
  sms: "رسالة نصية",
};

interface InvitationRow {
  id: string;
  email: string;
  delivery_method: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  accepted_at: string | null;
  retry_count: number;
  error_message: string | null;
}

// تعرض دعوات هذا المشروع فقط (وليس كل الشركة كما في /settings/invitations) — استعلام
// مباشر من عميل المتصفح لأن سياسة RLS الوحيدة على invitations تسمح لمديري الشركة
// بالقراءة مباشرة، ونافذة الدعوة أصلاً لا تُفتح إلا لمستخدم إداري.
function ManageInvitationsTab({ projectId }: { projectId: string }) {
  const supabase = createClient();
  const [rows, setRows] = useState<InvitationRow[] | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryMessage, setRetryMessage] = useState<{ id: string; text: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("invitations")
      .select("id, email, delivery_method, status, sent_at, opened_at, accepted_at, retry_count, error_message")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setRows((data as InvitationRow[] | null) ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- تُجلب عند فتح التبويب فقط
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل أولي لسجل دعوات هذا المشروع عند فتح التبويب
    load();
  }, [load]);

  async function retry(id: string) {
    setRetryingId(id);
    setRetryMessage(null);
    try {
      const res = await fetch(`/api/invitations/${id}/retry`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "تعذّرت إعادة الإرسال");
      setRetryMessage({ id, text: "تم إعادة الإرسال" });
      await load();
    } catch (e) {
      setRetryMessage({ id, text: e instanceof Error ? e.message : "تعذّرت إعادة الإرسال" });
    } finally {
      setRetryingId(null);
    }
  }

  if (rows === null) {
    return <div className="skeleton" style={{ height: 160, borderRadius: 10 }} />;
  }

  if (rows.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="userPlus" size={28} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا توجد دعوات مسجّلة لهذا المشروع بعد</p>
      </div>
    );
  }

  return (
    <div className="card table-scroll" style={{ overflow: "hidden" }}>
      <table className="data-table">
        <thead>
          <tr>
            <th>البريد الإلكتروني</th>
            <th>طريقة الإرسال</th>
            <th>الحالة</th>
            <th>أُرسلت</th>
            <th>فُتحت</th>
            <th>قُبلت</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const status = INVITATION_STATUS_META[r.status] ?? { label: r.status, color: "var(--text-muted)" };
            const canRetry = r.status === "failed" && r.delivery_method === "email";
            return (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.email}</td>
                <td>{INVITATION_METHOD_LABELS[r.delivery_method] ?? r.delivery_method}</td>
                <td>
                  <span className="chip" style={{ color: status.color, borderColor: status.color, fontSize: 11 }}>
                    {status.label}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.sent_at ? new Date(r.sent_at).toLocaleString("ar") : "—"}</td>
                <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.opened_at ? new Date(r.opened_at).toLocaleString("ar") : "—"}</td>
                <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.accepted_at ? new Date(r.accepted_at).toLocaleString("ar") : "—"}</td>
                <td>
                  {canRetry ? (
                    <button className="btn btn-outline" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => retry(r.id)} disabled={retryingId === r.id}>
                      {retryingId === r.id ? "جارٍ..." : "إعادة الإرسال"}
                    </button>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                  )}
                  {retryMessage?.id === r.id && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{retryMessage.text}</div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 6, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

function presetBtnStyle(active: boolean): React.CSSProperties {
  return {
    fontSize: 11.5,
    fontWeight: 700,
    padding: "6px 12px",
    borderRadius: 14,
    cursor: "pointer",
    border: "1px solid " + (active ? "var(--gold)" : "var(--border)"),
    background: active ? "rgba(var(--gold-rgb),0.12)" : "var(--bg-secondary)",
    color: active ? "var(--gold)" : "var(--text-secondary)",
  };
}

function methodBtnStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 9,
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: 700,
    border: "1px solid " + (active ? "var(--gold)" : "var(--border)"),
    background: active ? "rgba(var(--gold-rgb),0.1)" : "var(--bg-secondary)",
    color: active ? "var(--gold)" : "var(--text-primary)",
  };
}
