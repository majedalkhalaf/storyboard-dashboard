"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { CLIENT_PERMISSION_LABELS } from "@/app/lib/constants";
import type { ClientPermissions, ProjectClientStatus } from "@/app/lib/types";
import ClientInviteModal from "./ClientInviteModal";

export interface ProjectClientRow {
  id: string;
  invited_email: string;
  client_name: string | null;
  status: ProjectClientStatus;
  permissions: ClientPermissions;
}

const STATUS_LABELS: Record<ProjectClientStatus, { label: string; color: string }> = {
  invited: { label: "مدعو", color: "#F59E0B" },
  active: { label: "نشط", color: "#22C55E" },
  disabled: { label: "معطّل", color: "#6B7280" },
  revoked: { label: "ملغى", color: "#EF4444" },
};

export default function ClientsTab({ projectId, initialClients, onRefresh }: { projectId: string; initialClients: ProjectClientRow[]; onRefresh: () => void }) {
  const supabase = createClient();
  const [rows, setRows] = useState<ProjectClientRow[]>(initialClients);
  const [showInvite, setShowInvite] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function reload() {
    const { data } = await supabase
      .from("project_clients")
      .select("id, invited_email, status, permissions, client:clients(name)")
      .eq("project_id", projectId)
      .order("invited_at", { ascending: false });
    const mapped: ProjectClientRow[] = (data ?? []).map((r) => {
      const client = r.client as { name: string } | { name: string }[] | null;
      const name = Array.isArray(client) ? client[0]?.name ?? null : client?.name ?? null;
      return { id: r.id, invited_email: r.invited_email, client_name: name, status: r.status as ProjectClientStatus, permissions: r.permissions as ClientPermissions };
    });
    setRows(mapped);
    onRefresh();
  }

  async function togglePerm(row: ProjectClientRow, key: keyof ClientPermissions) {
    const next = { ...row.permissions, [key]: !row.permissions[key] };
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, permissions: next } : r)));
    await supabase.from("project_clients").update({ permissions: next }).eq("id", row.id);
  }

  async function revoke(row: ProjectClientRow) {
    if (!confirm(`إلغاء وصول ${row.client_name || row.invited_email}؟`)) return;
    await supabase.from("project_clients").update({ status: "revoked" }).eq("id", row.id);
    await reload();
  }

  const permKeys = Object.keys(CLIENT_PERMISSION_LABELS) as (keyof ClientPermissions)[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-gold" onClick={() => setShowInvite(true)}>
          <Icon name="userPlus" size={16} /> دعوة عميل
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state card">
          <Icon name="clients" size={30} className="text-muted" />
          <p style={{ marginTop: 10 }}>لم تتم دعوة أي عميل لهذا المشروع</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((row) => {
            const status = STATUS_LABELS[row.status];
            const grantedCount = permKeys.filter((k) => row.permissions[k]).length;
            const isOpen = expanded === row.id;
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
                    {row.status !== "revoked" && (
                      <button className="btn btn-danger" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => revoke(row)}>
                        إلغاء الوصول
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 6 }}>
                      {permKeys.map((key) => (
                        <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
                          <input type="checkbox" checked={row.permissions[key]} onChange={() => togglePerm(row, key)} />
                          {CLIENT_PERMISSION_LABELS[key]}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showInvite && <ClientInviteModal projectId={projectId} onClose={() => setShowInvite(false)} onInvited={reload} />}
    </div>
  );
}
