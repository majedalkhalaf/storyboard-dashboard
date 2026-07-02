"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import EpisodeFormModal from "./EpisodeFormModal";

interface ProjectOption {
  id: string;
  name: string;
}

// غلاف حول EpisodeFormModal لسياق "كل الحلقات": يطلب اختيار المشروع أولاً
// (لأن EpisodeFormModal مصمم للعمل ضمن مشروع واحد) ثم يحسب nextNumber/nextSortOrder
// بنفس طريقة ProjectDetailView (عدد حلقات المشروع الحالية).
export default function NewEpisodeModal({
  projects,
  episodes,
  onClose,
  onCreated,
}: {
  projects: ProjectOption[];
  episodes: { project_id: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [projectId, setProjectId] = useState("");

  if (!projectId) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>حلقة جديدة</h2>
            <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={onClose}>
              <Icon name="close" size={18} />
            </button>
          </div>

          <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
            المشروع *
          </label>
          <select className="input-field" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">— اختر مشروعاً —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {projects.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>
              لا توجد مشاريع بعد — أنشئ مشروعاً أولاً.
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            <button className="btn btn-ghost" onClick={onClose}>
              إلغاء
            </button>
          </div>
        </div>
      </div>
    );
  }

  const count = episodes.filter((e) => e.project_id === projectId).length;

  return (
    <EpisodeFormModal
      projectId={projectId}
      nextNumber={count + 1}
      nextSortOrder={count}
      onClose={onClose}
      onCreated={onCreated}
    />
  );
}
