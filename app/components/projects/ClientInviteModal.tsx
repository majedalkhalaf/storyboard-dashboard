"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { CLIENT_PERMISSION_LABELS, DEFAULT_CLIENT_PERMISSIONS } from "@/app/lib/constants";
import type { ClientPermissions } from "@/app/lib/types";

export default function ClientInviteModal({
  projectId,
  onClose,
  onInvited,
}: {
  projectId: string;
  onClose: () => void;
  onInvited: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [permissions, setPermissions] = useState<ClientPermissions>({ ...DEFAULT_CLIENT_PERMISSIONS });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const permKeys = Object.keys(CLIENT_PERMISSION_LABELS) as (keyof ClientPermissions)[];

  function togglePerm(key: keyof ClientPermissions) {
    setPermissions((p) => ({ ...p, [key]: !p[key] }));
  }

  async function submit() {
    if (!name.trim() || !email.trim()) {
      setError("الاسم والبريد الإلكتروني مطلوبان");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/invites/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, email: email.trim(), clientName: name.trim(), phone: phone.trim() || undefined, permissions }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "تعذّرت الدعوة");
      onInvited();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّرت الدعوة");
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>دعوة عميل</h2>
          <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {error && (
          <div className="btn-danger" style={{ display: "block", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
          <input className="input-field" placeholder="اسم العميل *" value={name} onChange={(e) => setName(e.target.value)} />
          <div style={{ display: "flex", gap: 10 }}>
            <input className="input-field" placeholder="البريد الإلكتروني *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="input-field" placeholder="الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", marginBottom: 10 }}>الصلاحيات</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6, marginBottom: 20 }}>
          {permKeys.map((key) => (
            <label
              key={key}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer", padding: "4px 0" }}
            >
              <input type="checkbox" checked={permissions[key]} onChange={() => togglePerm(key)} />
              {CLIENT_PERMISSION_LABELS[key]}
            </label>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
            إلغاء
          </button>
          <button className="btn btn-gold" onClick={submit} disabled={saving}>
            {saving ? "جارٍ الإرسال..." : "إرسال الدعوة"}
          </button>
        </div>
      </div>
    </div>
  );
}
