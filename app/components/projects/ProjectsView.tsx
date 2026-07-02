"use client";

import { useMemo, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/app/lib/constants";
import type { ClientRecord } from "@/app/lib/types";
import ProjectCard, { type ProjectListItem } from "./ProjectCard";
import ProjectFormModal from "./ProjectFormModal";

export default function ProjectsView({
  projects,
  clients,
}: {
  projects: ProjectListItem[];
  clients: Pick<ClientRecord, "id" | "name" | "email" | "phone">[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [showModal, setShowModal] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.client_name ?? "").toLowerCase().includes(q)) return false;
      if (statusFilter && p.status !== statusFilter) return false;
      if (typeFilter && p.type !== typeFilter) return false;
      return true;
    });
  }, [projects, search, statusFilter, typeFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            المشاريع
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{projects.length} مشروع</p>
        </div>
        <button className="btn btn-gold" onClick={() => setShowModal(true)}>
          <Icon name="plus" size={16} /> مشروع جديد
        </button>
      </div>

      {/* شريط البحث والفلاتر */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
            <Icon name="search" size={16} />
          </span>
          <input
            className="input-field"
            placeholder="ابحث باسم المشروع أو العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingRight: 38 }}
          />
        </div>
        <select className="input-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: "auto", minWidth: 150 }}>
          <option value="">كل الحالات</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select className="input-field" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: "auto", minWidth: 150 }}>
          <option value="">كل الأنواع</option>
          {PROJECT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Icon name="projects" size={36} className="text-muted" />
          <p style={{ marginTop: 12 }}>{projects.length === 0 ? "لا توجد مشاريع بعد" : "لا توجد نتائج مطابقة"}</p>
          {projects.length === 0 && (
            <button className="btn btn-gold" style={{ marginTop: 14 }} onClick={() => setShowModal(true)}>
              <Icon name="plus" size={16} /> إنشاء أول مشروع
            </button>
          )}
        </div>
      ) : (
        <div className="projects-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}

      {showModal && <ProjectFormModal clients={clients} onClose={() => setShowModal(false)} />}
    </div>
  );
}
