"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import TemplateFormModal from "./TemplateFormModal";
import { createClient } from "@/app/lib/supabase/client";
import { PROJECT_TYPES } from "@/app/lib/constants";
import type { ProjectTemplate } from "@/app/lib/types";

function typeLabel(value: string | null): string {
  if (!value) return "—";
  return PROJECT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export default function TemplatesClient({
  initialTemplates,
  companyId,
  userId,
}: {
  initialTemplates: ProjectTemplate[];
  companyId: string;
  userId: string;
}) {
  const supabase = createClient();
  const [templates, setTemplates] = useState<ProjectTemplate[]>(initialTemplates);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectTemplate | null>(null);

  const openNew = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (t: ProjectTemplate) => {
    setEditing(t);
    setModalOpen(true);
  };

  const onSaved = (t: ProjectTemplate) => {
    setTemplates((prev) => {
      const exists = prev.some((x) => x.id === t.id);
      return exists ? prev.map((x) => (x.id === t.id ? t : x)) : [t, ...prev];
    });
    setModalOpen(false);
  };

  const toggleActive = async (t: ProjectTemplate) => {
    const next = !t.is_active;
    setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_active: next } : x)));
    const { error } = await supabase.from("project_templates").update({ is_active: next }).eq("id", t.id);
    if (error) {
      setTemplates((prev) => prev.map((x) => (x.id === t.id ? { ...x, is_active: t.is_active } : x)));
    }
  };

  const remove = async (t: ProjectTemplate) => {
    if (!confirm(`حذف قالب "${t.name}"؟`)) return;
    const { error } = await supabase.from("project_templates").delete().eq("id", t.id);
    if (error) return;
    setTemplates((prev) => prev.filter((x) => x.id !== t.id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }} className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>القوالب</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>قوالب مشاريع جاهزة بمراحل وخدمات مُعرّفة مسبقاً</p>
        </div>
        <button className="btn btn-gold" onClick={openNew}>
          <Icon name="plus" size={16} /> قالب جديد
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="empty-state card">
          <Icon name="templates" size={32} className="text-muted" />
          <p style={{ marginTop: 12 }}>لا توجد قوالب بعد</p>
          <button className="btn btn-gold" style={{ marginTop: 14 }} onClick={openNew}>
            <Icon name="plus" size={16} /> إنشاء أول قالب
          </button>
        </div>
      ) : (
        <div className="settings-items-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {templates.map((t) => (
            <div key={t.id} className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>{typeLabel(t.project_type)}</div>
                </div>
                <button
                  className={`chip ${t.is_active ? "chip-gold" : ""}`}
                  onClick={() => toggleActive(t)}
                  style={{ cursor: "pointer" }}
                  title="تفعيل/تعطيل"
                >
                  {t.is_active ? "مُفعّل" : "معطّل"}
                </button>
              </div>

              {t.description && (
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{t.description}</p>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <span className="chip">{t.stages?.length ?? 0} مرحلة</span>
                <span className="chip">{t.services?.length ?? 0} خدمة</span>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 6 }}>
                <button className="btn btn-outline" style={{ flex: 1, justifyContent: "center" }} onClick={() => openEdit(t)}>
                  <Icon name="edit" size={15} /> تعديل
                </button>
                <button className="btn btn-danger" onClick={() => remove(t)} style={{ justifyContent: "center" }}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <TemplateFormModal
          companyId={companyId}
          userId={userId}
          template={editing}
          onClose={() => setModalOpen(false)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
