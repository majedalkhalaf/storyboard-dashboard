"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";

/**
 * عنوان قابل للتحرير Inline — نقطة دخول موحّدة لكل مكان يعرض عنواناً قابلاً للتعديل
 * (بطاقة الحلقة، رأس صفحة الحلقة، السكربت، الستوري بورد...). الحفظ يحدث بالضغط على
 * Enter أو زر الحفظ، والإلغاء يعيد القيمة الأصلية دون حفظ.
 */
export default function EditableTitle({
  value,
  onSave,
  fontSize = 15,
  fontWeight = 700,
  placeholder = "بدون عنوان",
  className,
  maxWidth,
}: {
  value: string;
  onSave: (next: string) => void | Promise<void>;
  fontSize?: number;
  fontWeight?: number;
  placeholder?: string;
  className?: string;
  maxWidth?: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  async function save() {
    const next = draft.trim();
    if (!next || next === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth }}>
        <input
          className="input-field"
          value={draft}
          autoFocus
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          style={{ fontSize, fontWeight, minWidth: 160 }}
        />
        <button type="button" className="btn btn-outline" style={{ padding: "6px 8px" }} title="حفظ" disabled={saving} onClick={save}>
          <Icon name="check" size={14} />
        </button>
        <button type="button" className="btn btn-outline" style={{ padding: "6px 8px" }} title="إلغاء" disabled={saving} onClick={cancel}>
          <Icon name="close" size={14} />
        </button>
      </div>
    );
  }

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize,
        fontWeight,
        cursor: "text",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth,
      }}
      onClick={startEdit}
      title="تعديل العنوان"
    >
      {value || placeholder}
      <Icon name="edit" size={Math.max(11, fontSize - 3)} className="text-muted" />
    </span>
  );
}
