"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { USER_ROLE_LABELS } from "@/app/lib/constants";
import Icon from "@/app/components/ui/Icon";

interface Member {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  job_title: string | null;
  created_at: string;
}
interface Invite {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export default function TeamClient({
  currentUserId,
  members,
  invites,
}: {
  currentUserId: string;
  members: Member[];
  invites: Invite[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "team_member">("team_member");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [jobTitleDrafts, setJobTitleDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(members.map((m) => [m.id, m.job_title ?? ""]))
  );

  async function sendInvite() {
    if (!email.trim() || !fullName.trim()) {
      setError("الاسم والبريد مطلوبان");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), fullName: fullName.trim(), role }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "تعذّر إرسال الدعوة");
      return;
    }
    setOpen(false);
    setEmail("");
    setFullName("");
    router.refresh();
  }

  async function changeRole(memberId: string, newRole: string) {
    setBusyId(memberId);
    const supabase = createClient();
    await supabase.from("profiles").update({ role: newRole }).eq("id", memberId);
    setBusyId(null);
    router.refresh();
  }

  // مسمّى وظيفي حر (مصمم/مونتير/مشرف...) — يظهر بجانب اسم العضو في سجلّ
  // العمليات وطلبات التعديل بدل الاكتفاء بتصنيف "عضو فريق" العام، بحسب طلب
  // صريح بمعرفة "صفة" المرسل بدقة أكبر.
  async function saveJobTitle(memberId: string) {
    const value = jobTitleDrafts[memberId]?.trim() || null;
    const supabase = createClient();
    await supabase.from("profiles").update({ job_title: value }).eq("id", memberId);
    router.refresh();
  }

  async function removeMember(memberId: string) {
    if (!confirm("إزالة هذا العضو من الشركة؟")) return;
    setBusyId(memberId);
    const supabase = createClient();
    await supabase.from("profiles").update({ company_id: null }).eq("id", memberId);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            الفريق
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{members.length} عضو</p>
        </div>
        <button className="btn btn-gold" onClick={() => setOpen(true)}>
          <Icon name="userPlus" size={16} /> دعوة عضو جديد
        </button>
      </div>

      <div className="card table-scroll" style={{ overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد الإلكتروني</th>
              <th>الدور</th>
              <th>المسمّى الوظيفي</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 700 }}>{m.full_name || "بدون اسم"}</td>
                <td>{m.email}</td>
                <td>
                  {m.role === "company_owner" || m.role === "super_admin" ? (
                    <span className="chip chip-gold">{USER_ROLE_LABELS[m.role]}</span>
                  ) : (
                    <select
                      className="input-field"
                      style={{ width: "auto", padding: "4px 8px", fontSize: 12 }}
                      value={m.role}
                      disabled={busyId === m.id}
                      onChange={(e) => changeRole(m.id, e.target.value)}
                    >
                      <option value="admin">مدير مشروع</option>
                      <option value="team_member">عضو فريق</option>
                    </select>
                  )}
                </td>
                <td>
                  <input
                    className="input-field"
                    style={{ width: 140, padding: "4px 8px", fontSize: 12 }}
                    placeholder="مثال: مصمم"
                    value={jobTitleDrafts[m.id] ?? ""}
                    onChange={(e) => setJobTitleDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    onBlur={() => saveJobTitle(m.id)}
                  />
                </td>
                <td>
                  {m.id !== currentUserId && m.role !== "company_owner" && m.role !== "super_admin" && (
                    <button className="btn btn-ghost" style={{ padding: 6, color: "#EF4444" }} disabled={busyId === m.id} onClick={() => removeMember(m.id)}>
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {invites.length > 0 && (
        <div>
          <h3 style={{ fontWeight: 700, marginBottom: 10 }}>دعوات معلّقة</h3>
          <div className="card table-scroll" style={{ overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>البريد</th>
                  <th>الدور</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.email}</td>
                    <td>{USER_ROLE_LABELS[inv.role] ?? inv.role}</td>
                    <td>
                      <span className="chip">{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {open && (
        <div className="modal-overlay no-print" onClick={() => !saving && setOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>دعوة عضو جديد</h3>
              <button className="btn btn-ghost" style={{ padding: 6 }} onClick={() => setOpen(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                الاسم الكامل
                <input className="input-field" style={{ marginTop: 6 }} value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </label>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                البريد الإلكتروني
                <input className="input-field" style={{ marginTop: 6 }} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                الدور
                <select className="input-field" style={{ marginTop: 6 }} value={role} onChange={(e) => setRole(e.target.value as "admin" | "team_member")}>
                  <option value="team_member">عضو فريق</option>
                  <option value="admin">مدير مشروع</option>
                </select>
              </label>
              {error && <p style={{ color: "#EF4444", fontSize: 13 }}>{error}</p>}
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button className="btn btn-gold" onClick={sendInvite} disabled={saving} style={{ flex: 1 }}>
                  {saving ? "جارٍ الإرسال..." : "إرسال الدعوة"}
                </button>
                <button className="btn btn-outline" onClick={() => setOpen(false)} disabled={saving}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
