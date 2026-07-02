"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import Modal, { Field } from "@/app/components/settings/Modal";
import { createClient } from "@/app/lib/supabase/client";
import { PROJECT_TYPES, SERVICES_CATALOG } from "@/app/lib/constants";
import type { ProjectTemplate } from "@/app/lib/types";

type Stage = { key: string; label: string };
type Service = { category: string; service_key: string; label: string };

function slugify(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
  return base || `stage_${Math.random().toString(36).slice(2, 7)}`;
}

export default function TemplateFormModal({
  companyId,
  userId,
  template,
  onClose,
  onSaved,
}: {
  companyId: string;
  userId: string;
  template: ProjectTemplate | null;
  onClose: () => void;
  onSaved: (t: ProjectTemplate) => void;
}) {
  const supabase = createClient();
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [projectType, setProjectType] = useState(template?.project_type ?? PROJECT_TYPES[0].value);
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [stages, setStages] = useState<Stage[]>(template?.stages ?? []);
  const [services, setServices] = useState<Service[]>(template?.services ?? []);
  const [newStage, setNewStage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addStage = () => {
    const label = newStage.trim();
    if (!label) return;
    setStages((prev) => [...prev, { key: slugify(label), label }]);
    setNewStage("");
  };

  const removeStage = (idx: number) => setStages((prev) => prev.filter((_, i) => i !== idx));

  const moveStage = (idx: number, dir: -1 | 1) => {
    setStages((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const isServiceChecked = (category: string, key: string) =>
    services.some((s) => s.category === category && s.service_key === key);

  const toggleService = (category: string, key: string, label: string) => {
    setServices((prev) =>
      isServiceChecked(category, key)
        ? prev.filter((s) => !(s.category === category && s.service_key === key))
        : [...prev, { category, service_key: key, label }]
    );
  };

  const save = async () => {
    if (!name.trim()) {
      setError("اسم القالب مطلوب");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      company_id: companyId,
      name: name.trim(),
      description: description.trim() || null,
      project_type: projectType,
      is_active: isActive,
      stages,
      services,
    };

    if (template) {
      const { data, error: err } = await supabase
        .from("project_templates")
        .update(payload)
        .eq("id", template.id)
        .select("*")
        .single();
      if (err) {
        setError("تعذّر حفظ التعديلات");
        setSaving(false);
        return;
      }
      onSaved(data as ProjectTemplate);
    } else {
      const { data, error: err } = await supabase
        .from("project_templates")
        .insert({ ...payload, created_by: userId })
        .select("*")
        .single();
      if (err) {
        setError("تعذّر إنشاء القالب");
        setSaving(false);
        return;
      }
      onSaved(data as ProjectTemplate);
    }
    setSaving(false);
  };

  return (
    <Modal
      title={template ? "تعديل قالب" : "قالب جديد"}
      onClose={onClose}
      maxWidth={640}
      footer={
        <>
          <button className="btn btn-gold" onClick={save} disabled={saving}>
            {saving ? "جارٍ الحفظ..." : "حفظ القالب"}
          </button>
          <button className="btn btn-outline" onClick={onClose}>إلغاء</button>
        </>
      }
    >
      {error && <div className="btn-danger" style={{ width: "100%", justifyContent: "center", marginBottom: 14, cursor: "default" }}>{error}</div>}

      <Field label="اسم القالب">
        <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: قالب بودكاست" />
      </Field>

      <Field label="الوصف">
        <textarea className="input-field" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: "vertical" }} />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="نوع المشروع">
          <select className="input-field" value={projectType ?? ""} onChange={(e) => setProjectType(e.target.value)}>
            {PROJECT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field label="الحالة">
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", height: 42 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span style={{ fontSize: 14 }}>{isActive ? "مُفعّل" : "غير مُفعّل"}</span>
          </label>
        </Field>
      </div>

      {/* المراحل */}
      <div style={{ marginTop: 6, marginBottom: 18 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
          مراحل الحلقات ({stages.length})
        </span>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            className="input-field"
            value={newStage}
            onChange={(e) => setNewStage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addStage();
              }
            }}
            placeholder="اسم المرحلة ثم Enter"
          />
          <button type="button" className="btn btn-outline" onClick={addStage}>
            <Icon name="plus" size={16} />
          </button>
        </div>
        {stages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {stages.map((s, idx) => (
              <div key={`${s.key}-${idx}`} className="card" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
                <span style={{ color: "var(--text-muted)", fontSize: 12, minWidth: 20 }}>{idx + 1}</span>
                <span style={{ flex: 1, fontSize: 14 }}>{s.label}</span>
                <button type="button" className="btn-ghost" onClick={() => moveStage(idx, -1)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                  <Icon name="chevronDown" size={16} className="rotate-180" />
                </button>
                <button type="button" className="btn-ghost" onClick={() => moveStage(idx, 1)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                  <Icon name="chevronDown" size={16} />
                </button>
                <button type="button" className="btn-ghost" onClick={() => removeStage(idx)} style={{ padding: 4, background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* الخدمات */}
      <div>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-secondary)" }}>
          الخدمات المتضمّنة ({services.length})
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {SERVICES_CATALOG.map((group) => (
            <div key={group.category}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 6 }}>{group.label}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 6 }}>
                {group.services.map((svc) => (
                  <label key={svc.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={isServiceChecked(group.category, svc.key)}
                      onChange={() => toggleService(group.category, svc.key, svc.label)}
                    />
                    <span>{svc.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
