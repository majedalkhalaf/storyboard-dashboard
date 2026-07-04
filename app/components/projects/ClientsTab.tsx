"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { permissionCountOf } from "@/app/lib/client-invite-catalog";
import type { ClientAccessType, ClientInviteDraft, ClientPermissions, ProjectClientStatus } from "@/app/lib/types";
import { formatDate, relativeTime } from "./utils";
import ClientInviteModal from "./ClientInviteModal";
import ClientPermissionsEditor from "./ClientPermissionsEditor";

export interface ProjectClientRow {
  id: string;
  client_id: string | null;
  invited_email: string;
  client_name: string | null;
  client_phone: string | null;
  client_job_title: string | null;
  client_company_name: string | null;
  status: ProjectClientStatus;
  permissions: ClientPermissions;
  invited_at: string;
  activated_at: string | null;
  expires_at: string | null;
  access_type: ClientAccessType;
}

const STATUS_LABELS: Record<ProjectClientStatus, { label: string; color: string }> = {
  invited: { label: "مدعو", color: "#F59E0B" },
  active: { label: "نشط", color: "#1DB954" },
  disabled: { label: "معطّل", color: "#6B7280" },
  revoked: { label: "ملغى", color: "#EF4444" },
};

const ACCESS_TYPE_LABELS: Record<ClientAccessType, string> = {
  unlimited: "غير محدود",
  single_use: "مرة واحدة",
  until_project_end: "حتى انتهاء المشروع",
  until_date: "حتى تاريخ محدد",
};

interface ResendResult {
  tempPassword: string | null;
  emailSent: boolean;
  whatsappLink: string | null;
  whatsappSentAutomatically: boolean;
  inviteMessage: string;
  email: string;
}

export default function ClientsTab({ projectId, initialClients, onRefresh }: { projectId: string; initialClients: ProjectClientRow[]; onRefresh: () => void }) {
  const supabase = createClient();
  const { company } = useSession();
  const companyId = company!.id;
  const [rows, setRows] = useState<ProjectClientRow[]>(initialClients);
  const [showInvite, setShowInvite] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", company: "", phone: "", jobTitle: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendResults, setResendResults] = useState<Record<string, ResendResult | string>>({});
  const [drafts, setDrafts] = useState<ClientInviteDraft[]>([]);
  const [resumeDraft, setResumeDraft] = useState<ClientInviteDraft | null>(null);
  const [copied, setCopied] = useState<string>("");

  async function reloadDrafts() {
    const { data } = await supabase
      .from("client_invite_drafts")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });
    setDrafts((data ?? []) as ClientInviteDraft[]);
  }

  useEffect(() => {
    reloadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- تُجلب مرة واحدة عند تحميل التبويب لهذا المشروع
  }, [projectId]);

  async function deleteDraft(draftId: string) {
    if (!confirm("حذف هذه المسودة نهائياً؟")) return;
    setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    await supabase.from("client_invite_drafts").delete().eq("id", draftId);
  }

  function resumeDraftFlow(draft: ClientInviteDraft) {
    setResumeDraft(draft);
    setShowInvite(true);
  }

  function closeInvite() {
    setShowInvite(false);
    setResumeDraft(null);
  }

  async function reload() {
    const { data } = await supabase
      .from("project_clients")
      .select("id, invited_email, status, permissions, invited_at, activated_at, expires_at, access_type, client_id, client:clients(id, name, phone, job_title, client_company_name)")
      .eq("project_id", projectId)
      .order("invited_at", { ascending: false });
    const mapped: ProjectClientRow[] = (data ?? []).map((r) => {
      type ClientJoin = { id: string; name: string; phone: string | null; job_title: string | null; client_company_name: string | null };
      const client = r.client as ClientJoin | ClientJoin[] | null;
      const c = Array.isArray(client) ? client[0] ?? null : client;
      return {
        id: r.id,
        client_id: r.client_id,
        invited_email: r.invited_email,
        client_name: c?.name ?? null,
        client_phone: c?.phone ?? null,
        client_job_title: c?.job_title ?? null,
        client_company_name: c?.client_company_name ?? null,
        status: r.status as ProjectClientStatus,
        permissions: r.permissions as ClientPermissions,
        invited_at: r.invited_at,
        activated_at: r.activated_at,
        expires_at: r.expires_at,
        access_type: r.access_type as ClientAccessType,
      };
    });
    setRows(mapped);
    onRefresh();
  }

  async function applyPermissionsToRow(row: ProjectClientRow, next: ClientPermissions) {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, permissions: next } : r)));
    await supabase.from("project_clients").update({ permissions: next }).eq("id", row.id);
  }

  async function revoke(row: ProjectClientRow) {
    if (!confirm(`إلغاء وصول ${row.client_name || row.invited_email}؟`)) return;
    await supabase.from("project_clients").update({ status: "revoked" }).eq("id", row.id);
    await reload();
  }

  async function reactivate(row: ProjectClientRow) {
    await supabase.from("project_clients").update({ status: "active" }).eq("id", row.id);
    await reload();
  }

  async function deleteClient(row: ProjectClientRow) {
    if (!confirm(`حذف ${row.client_name || row.invited_email} نهائياً من هذا المشروع؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
    await supabase.from("project_clients").delete().eq("id", row.id);
    await reload();
  }

  function startEdit(row: ProjectClientRow) {
    setEditingId(row.id);
    setEditForm({
      name: row.client_name ?? "",
      company: row.client_company_name ?? "",
      phone: row.client_phone ?? "",
      jobTitle: row.client_job_title ?? "",
    });
  }

  async function saveEdit(row: ProjectClientRow) {
    if (!row.client_id) return;
    setSavingEdit(true);
    await supabase
      .from("clients")
      .update({
        name: editForm.name.trim() || row.invited_email,
        client_company_name: editForm.company.trim() || null,
        phone: editForm.phone.trim() || null,
        job_title: editForm.jobTitle.trim() || null,
      })
      .eq("id", row.client_id);
    setSavingEdit(false);
    setEditingId(null);
    await reload();
  }

  async function resend(row: ProjectClientRow, regeneratePassword: boolean) {
    setResendingId(row.id);
    setResendResults((prev) => ({ ...prev, [row.id]: "" }));
    try {
      const res = await fetch("/api/invitations/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectClientId: row.id, regeneratePassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "تعذّرت إعادة الإرسال");
      setResendResults((prev) => ({ ...prev, [row.id]: json as ResendResult }));
    } catch (e) {
      setResendResults((prev) => ({ ...prev, [row.id]: e instanceof Error ? e.message : "تعذّرت إعادة الإرسال" }));
    } finally {
      setResendingId(null);
    }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(""), 1800);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-gold" onClick={() => setShowInvite(true)}>
          <Icon name="userPlus" size={16} /> دعوة عميل
        </button>
      </div>

      {drafts.length > 0 && (
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>المسودات</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {drafts.map((d) => (
              <div key={d.id} className="card" style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{d.client_name || d.email}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {d.email} · آخر تعديل {relativeTime(d.updated_at)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => resumeDraftFlow(d)}>
                    <Icon name="edit" size={13} /> متابعة
                  </button>
                  <button className="btn-ghost" style={{ padding: "6px 8px", color: "var(--danger)" }} onClick={() => deleteDraft(d.id)}>
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="empty-state card">
          <Icon name="clients" size={30} className="text-muted" />
          <p style={{ marginTop: 10 }}>لم تتم دعوة أي عميل لهذا المشروع</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((row) => {
            const status = STATUS_LABELS[row.status];
            const grantedCount = permissionCountOf(row.permissions);
            const otherRows = rows.filter((r) => r.id !== row.id);
            const isOpen = expanded === row.id;
            const isEditing = editingId === row.id;
            const result = resendResults[row.id];
            return (
              <div key={row.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{row.client_name || row.invited_email}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{row.invited_email}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="chip" style={{ color: status.color, borderColor: status.color }}>
                      {status.label}
                    </span>
                    <span className="chip">{grantedCount} صلاحية</span>
                    <button className="btn-ghost" style={{ padding: "6px 8px", borderRadius: 8 }} onClick={() => setExpanded(isOpen ? null : row.id)}>
                      <Icon name={isOpen ? "chevronDown" : "chevronLeft"} size={16} />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 16 }}>
                    {/* ── التفاصيل / التعديل ── */}
                    {isEditing ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <EditField label="الاسم">
                          <input className="input-field" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                        </EditField>
                        <EditField label="اسم الشركة">
                          <input className="input-field" value={editForm.company} onChange={(e) => setEditForm((f) => ({ ...f, company: e.target.value }))} />
                        </EditField>
                        <EditField label="رقم الجوال">
                          <input className="input-field" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} style={{ direction: "ltr", textAlign: "right" }} />
                        </EditField>
                        <EditField label="المسمى الوظيفي">
                          <input className="input-field" value={editForm.jobTitle} onChange={(e) => setEditForm((f) => ({ ...f, jobTitle: e.target.value }))} />
                        </EditField>
                        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8 }}>
                          <button className="btn btn-gold" style={{ fontSize: 12 }} onClick={() => saveEdit(row)} disabled={savingEdit}>
                            {savingEdit ? "جارٍ الحفظ..." : "حفظ"}
                          </button>
                          <button className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => setEditingId(null)} disabled={savingEdit}>
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, fontSize: 12.5 }}>
                        <DetailItem icon="phone" label="الجوال" value={row.client_phone || "—"} />
                        <DetailItem icon="company" label="الشركة" value={row.client_company_name || "—"} />
                        <DetailItem icon="user" label="المسمى الوظيفي" value={row.client_job_title || "—"} />
                        <DetailItem icon="calendar" label="تاريخ الدعوة" value={formatDate(row.invited_at)} />
                        <DetailItem icon="checkCircle" label="تاريخ التفعيل" value={row.activated_at ? formatDate(row.activated_at) : "لم يُفعَّل بعد"} />
                        <DetailItem icon="clock" label="صلاحية الوصول" value={ACCESS_TYPE_LABELS[row.access_type]} />
                        <DetailItem icon="calendar" label="تنتهي في" value={row.expires_at ? formatDate(row.expires_at) : "غير محدود"} />
                      </div>
                    )}

                    {/* ── أزرار الإجراءات ── */}
                    {!isEditing && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn btn-outline" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => startEdit(row)}>
                          <Icon name="edit" size={13} /> تعديل البيانات
                        </button>
                        <button className="btn btn-outline" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => resend(row, false)} disabled={resendingId === row.id}>
                          <Icon name="send" size={13} /> {resendingId === row.id ? "جارٍ الإرسال..." : "إعادة إرسال الدعوة"}
                        </button>
                        <button className="btn btn-outline" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => resend(row, true)} disabled={resendingId === row.id}>
                          <Icon name="shield" size={13} /> توليد كلمة مرور مؤقتة جديدة
                        </button>
                        {row.status === "revoked" ? (
                          <button className="btn btn-outline" style={{ fontSize: 12, padding: "6px 12px", color: "var(--success)" }} onClick={() => reactivate(row)}>
                            إعادة تفعيل
                          </button>
                        ) : (
                          <button className="btn btn-danger" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => revoke(row)}>
                            إلغاء الوصول
                          </button>
                        )}
                        <button className="btn-ghost" style={{ fontSize: 12, padding: "6px 12px", color: "var(--danger)" }} onClick={() => deleteClient(row)}>
                          <Icon name="trash" size={13} /> حذف نهائياً
                        </button>
                      </div>
                    )}

                    {/* ── نتيجة إعادة الإرسال ── */}
                    {result && typeof result === "string" && result && (
                      <div className="btn-danger" style={{ display: "block", padding: "8px 12px", borderRadius: 8, fontSize: 12.5 }}>
                        {result}
                      </div>
                    )}
                    {result && typeof result === "object" && (
                      <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14, background: "var(--bg-secondary)" }}>
                        {result.tempPassword ? (
                          <p style={{ fontSize: 11.5, color: "#eab308", marginBottom: 10 }}>⚠️ كلمة المرور المؤقتة الجديدة تظهر مرة واحدة فقط — انسخها الآن.</p>
                        ) : (
                          <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 10 }}>العميل فعّل حسابه مسبقاً — أُعيد إرسال رابط الدخول فقط بلا كلمة مرور جديدة.</p>
                        )}
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: result.tempPassword ? 10 : 0 }}>
                          <button className="btn btn-gold" style={{ fontSize: 12 }} onClick={() => copyText(result.inviteMessage, `${row.id}-msg`)}>
                            <Icon name="copy" size={13} /> {copied === `${row.id}-msg` ? "تم النسخ" : "نسخ الرسالة كاملة"}
                          </button>
                          {result.whatsappLink && (
                            <a
                              href={result.whatsappLink}
                              target="_blank"
                              rel="noreferrer"
                              className="btn"
                              style={{ fontSize: 12, background: "#25D366", color: "#fff", fontWeight: 700 }}
                            >
                              <Icon name="phone" size={13} /> إرسال واتساب
                            </a>
                          )}
                          {result.emailSent && <span className="chip" style={{ color: "var(--success)", borderColor: "var(--success)" }}>تم إرسال البريد ✓</span>}
                        </div>
                        {result.tempPassword && (
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <code style={{ fontSize: 13, fontWeight: 800, background: "var(--bg-card)", padding: "6px 10px", borderRadius: 6, letterSpacing: 1 }}>{result.tempPassword}</code>
                            <button className="btn-ghost" style={{ padding: "4px 8px" }} onClick={() => copyText(result.tempPassword!, `${row.id}-pw`)}>
                              <Icon name={copied === `${row.id}-pw` ? "check" : "copy"} size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── الصلاحيات ── */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)" }}>الصلاحيات</div>
                        {otherRows.length > 0 && (
                          <select
                            className="input-field"
                            style={{ width: "auto", fontSize: 11.5, padding: "5px 8px" }}
                            defaultValue=""
                            onChange={(e) => {
                              const source = otherRows.find((r) => r.id === e.target.value);
                              if (source) applyPermissionsToRow(row, { ...source.permissions });
                              e.target.value = "";
                            }}
                          >
                            <option value="" disabled>
                              نسخ صلاحيات من عميل آخر في هذا المشروع...
                            </option>
                            {otherRows.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.client_name || r.invited_email}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <ClientPermissionsEditor companyId={companyId} permissions={row.permissions} onChange={(next) => applyPermissionsToRow(row, next)} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showInvite && (
        <ClientInviteModal
          projectId={projectId}
          draft={resumeDraft ?? undefined}
          onClose={closeInvite}
          onInvited={() => {
            reload();
            reloadDrafts();
          }}
          onDraftSaved={reloadDrafts}
        />
      )}
    </div>
  );
}

function DetailItem({ icon, label, value }: { icon: Parameters<typeof Icon>[0]["name"]; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <span style={{ color: "var(--text-muted)", display: "inline-flex", marginTop: 2, flexShrink: 0 }}>
        <Icon name={icon} size={14} />
      </span>
      <div>
        <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{label}</div>
        <div style={{ color: "var(--text-primary)", fontWeight: 600, marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4, fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}
