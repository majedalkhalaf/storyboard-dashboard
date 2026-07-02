"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { CLIENT_PERMISSION_LABELS } from "@/app/lib/constants";
import { PROJECT_STATUSES } from "@/app/lib/constants";
import type { ClientRecord, ClientPermissions, ProjectClient, ProjectClientStatus } from "@/app/lib/types";

type LinkRow = ProjectClient & { project: { id: string; name: string; status: string } | null };

const PERMISSION_KEYS = Object.keys(CLIENT_PERMISSION_LABELS) as (keyof ClientPermissions)[];

const STATUS_OPTIONS: { value: ProjectClientStatus; label: string; color: string }[] = [
  { value: "invited", label: "مدعو", color: "#8B5CF6" },
  { value: "active", label: "نشط", color: "#1DB954" },
  { value: "disabled", label: "معطّل", color: "#F59E0B" },
  { value: "revoked", label: "ملغى", color: "#EF4444" },
];

export default function ClientDetailClient({ client, links: initialLinks }: { client: ClientRecord; links: LinkRow[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [links, setLinks] = useState<LinkRow[]>(initialLinks);

  // ── بيانات العميل ──
  const [info, setInfo] = useState({
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    notes: client.notes ?? "",
  });
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const saveInfo = async () => {
    setSavingInfo(true);
    setInfoMsg(null);
    const { error } = await supabase
      .from("clients")
      .update({
        name: info.name.trim(),
        email: info.email.trim() || null,
        phone: info.phone.trim() || null,
        notes: info.notes.trim() || null,
      })
      .eq("id", client.id);
    setSavingInfo(false);
    setInfoMsg(error ? "تعذّر الحفظ" : "تم الحفظ");
    if (!error) router.refresh();
    setTimeout(() => setInfoMsg(null), 2500);
  };

  const [savingLinkId, setSavingLinkId] = useState<string | null>(null);

  const togglePermission = (linkId: string, key: keyof ClientPermissions) => {
    setLinks((prev) =>
      prev.map((l) =>
        l.id === linkId ? { ...l, permissions: { ...l.permissions, [key]: !l.permissions[key] } } : l
      )
    );
  };

  const savePermissions = async (link: LinkRow) => {
    setSavingLinkId(link.id);
    const { error } = await supabase
      .from("project_clients")
      .update({ permissions: link.permissions })
      .eq("id", link.id);
    setSavingLinkId(null);
    if (error) return;
    router.refresh();
  };

  const changeStatus = async (link: LinkRow, status: ProjectClientStatus) => {
    setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, status } : l)));
    const { error } = await supabase.from("project_clients").update({ status }).eq("id", link.id);
    if (error) {
      setLinks((prev) => prev.map((l) => (l.id === link.id ? { ...l, status: link.status } : l)));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/clients" className="btn-ghost" style={{ padding: 6, borderRadius: 8, color: "var(--text-secondary)" }}>
          <Icon name="arrowRight" size={20} />
        </Link>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>{client.name}</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>معلومات العميل وصلاحيات الوصول للمشاريع</p>
        </div>
      </div>

      {/* بيانات العميل */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>بيانات العميل</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <label>
            <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>الاسم</span>
            <input className="input-field" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} />
          </label>
          <label>
            <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>البريد الإلكتروني</span>
            <input dir="ltr" className="input-field" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} />
          </label>
          <label>
            <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>الهاتف</span>
            <input dir="ltr" className="input-field" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} />
          </label>
        </div>
        <label style={{ display: "block", marginTop: 14 }}>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "var(--text-secondary)" }}>ملاحظات</span>
          <textarea className="input-field" rows={2} value={info.notes} onChange={(e) => setInfo({ ...info, notes: e.target.value })} style={{ resize: "vertical" }} />
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <button className="btn btn-gold" onClick={saveInfo} disabled={savingInfo}>
            {savingInfo ? "جارٍ الحفظ..." : "حفظ البيانات"}
          </button>
          {infoMsg && <span style={{ fontSize: 13, color: "var(--gold)" }}>{infoMsg}</span>}
        </div>
      </div>

      {/* روابط المشاريع */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>وصول المشاريع ({links.length})</h2>
        {links.length === 0 ? (
          <div className="empty-state card">
            <Icon name="projects" size={30} className="text-muted" />
            <p style={{ marginTop: 10 }}>هذا العميل غير مرتبط بأي مشروع بعد</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              يتم ربط العملاء بالمشاريع من داخل صفحة المشروع عبر دعوتهم.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {links.map((link) => {
              const statusInfo = PROJECT_STATUSES.find((s) => s.value === link.project?.status);
              const activeCount = PERMISSION_KEYS.filter((k) => link.permissions[k]).length;
              return (
                <div key={link.id} className="card" style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {link.project ? (
                          <Link href={`/projects/${link.project.id}`} style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>
                            {link.project.name}
                          </Link>
                        ) : (
                          <span style={{ fontWeight: 800, fontSize: 15 }}>مشروع محذوف</span>
                        )}
                        {statusInfo && (
                          <span className="chip" style={{ color: statusInfo.color, borderColor: statusInfo.color }}>{statusInfo.label}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }} dir="ltr">
                        {link.invited_email}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>الحالة</span>
                      <select
                        className="input-field"
                        style={{ width: "auto", padding: "6px 10px" }}
                        value={link.status}
                        onChange={(e) => changeStatus(link, e.target.value as ProjectClientStatus)}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>
                    الصلاحيات ({activeCount}/{PERMISSION_KEYS.length})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8 }}>
                    {PERMISSION_KEYS.map((key) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={Boolean(link.permissions[key])}
                          onChange={() => togglePermission(link.id, key)}
                        />
                        <span>{CLIENT_PERMISSION_LABELS[key]}</span>
                      </label>
                    ))}
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <button className="btn btn-gold" onClick={() => savePermissions(link)} disabled={savingLinkId === link.id}>
                      {savingLinkId === link.id ? "جارٍ الحفظ..." : "حفظ الصلاحيات"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
