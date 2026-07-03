"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import Modal from "@/app/components/settings/Modal";
import type { Project } from "@/app/lib/types";

// خطوة وسيطة مشتركة: بعض إجراءات العميل (دعوة، رفع ملف) تحتاج تحديد مشروع معيّن أولاً
// لأن الملفات ودعوات العملاء مرتبطة بمشروع، وليس بالعميل مباشرة في المخطط الحالي.
export default function ProjectPickerModal({
  title,
  projects,
  onClose,
  onPick,
}: {
  title: string;
  projects: Project[];
  onClose: () => void;
  onPick: (projectId: string) => void;
}) {
  const [selected, setSelected] = useState(projects[0]?.id ?? "");

  return (
    <Modal
      title={title}
      onClose={onClose}
      maxWidth={420}
      footer={
        projects.length > 0 ? (
          <button className="btn btn-gold" onClick={() => onPick(selected)} disabled={!selected}>
            متابعة
          </button>
        ) : undefined
      }
    >
      {projects.length === 0 ? (
        <div className="empty-state">
          <Icon name="projects" size={28} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد مشاريع لهذا العميل بعد — أنشئ مشروعاً أولاً</p>
        </div>
      ) : (
        <div>
          <label style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>اختر المشروع</label>
          <select className="input-field" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </Modal>
  );
}
