"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { SERVICES_CATALOG } from "@/app/lib/constants";
import type { Project, ProjectServiceItem } from "@/app/lib/types";
import ClientsTab, { type ProjectClientRow } from "./ClientsTab";

type DrawerTab = "info" | "clients";

export default function ProjectSettingsDrawer({
  project,
  services,
  projectClients,
  initialTab,
  onClose,
  onProjectChanged,
  onClientsChanged,
}: {
  project: Project;
  services: ProjectServiceItem[];
  projectClients: ProjectClientRow[];
  initialTab: DrawerTab;
  onClose: () => void;
  onProjectChanged: (patch: Partial<Project>) => void;
  onClientsChanged: () => void;
}) {
  const supabase = createClient();
  const [tab, setTab] = useState<DrawerTab>(initialTab);
  const [budget, setBudget] = useState(project.budget != null ? String(project.budget) : "");
  const [location, setLocation] = useState(project.location ?? "");
  const [storageLink, setStorageLink] = useState(project.storage_link ?? "");
  const [notes, setNotes] = useState(project.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function saveInfo() {
    setSaving(true);
    const patch = {
      budget: budget ? Number(budget) : null,
      location: location.trim() || null,
      storage_link: storageLink.trim() || null,
      notes: notes.trim() || null,
    };
    await supabase.from("projects").update(patch).eq("id", project.id);
    onProjectChanged(patch);
    setSaving(false);
  }

  const grouped = SERVICES_CATALOG.map((g) => ({ ...g, picked: services.filter((s) => s.category === g.category) })).filter((g) => g.picked.length > 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 640, maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>إعدادات المشروع</h2>
          <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 18 }}>
          {(
            [
              { key: "info", label: "معلومات عامة" },
              { key: "clients", label: `العملاء (${projectClients.length})` },
            ] as { key: DrawerTab; label: string }[]
          ).map((t) => (
            <button
              key={t.key}
              className="btn-ghost"
              onClick={() => setTab(t.key)}
              style={{
                padding: "8px 14px",
                borderRadius: 0,
                borderBottom: tab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
                color: tab === t.key ? "var(--gold)" : "var(--text-secondary)",
                fontWeight: tab === t.key ? 700 : 500,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "info" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>الميزانية</label>
                <input type="number" className="input-field" value={budget} onChange={(e) => setBudget(e.target.value)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>الموقع</label>
                <input className="input-field" value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>رابط التخزين</label>
              <input className="input-field" value={storageLink} onChange={(e) => setStorageLink(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>ملاحظات المشروع</label>
              <textarea className="input-field" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: "vertical" }} />
            </div>

            {grouped.length > 0 && (
              <div>
                <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>الخدمات المتفق عليها</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {grouped.map((g) => (
                    <div key={g.category}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", marginBottom: 5 }}>{g.label}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {g.picked.map((s) => (
                          <span key={s.id} className={s.is_custom ? "chip chip-gold" : "chip"}>
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
              <button className="btn btn-gold" onClick={saveInfo} disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
              </button>
            </div>
          </div>
        )}

        {tab === "clients" && <ClientsTab projectId={project.id} initialClients={projectClients} onRefresh={onClientsChanged} />}
      </div>
    </div>
  );
}
