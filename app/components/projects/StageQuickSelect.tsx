"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import type { CompanyPipelineStage } from "@/app/lib/types";

/**
 * اختصار "تغيير المرحلة" — Dropdown مضغوط يستبدل الحاجة للدخول لصفحة مراحل التنفيذ
 * الطويلة لمجرد تحديث أين تقف الحلقة الآن. لا علاقة له بنظام episode_stages
 * التفصيلي (10 مراحل) — حقل منفصل تماماً (episodes.pipeline_stage).
 */
export default function StageQuickSelect({
  stages,
  currentKey,
  onChange,
  disabled,
  size = "md",
}: {
  stages: CompanyPipelineStage[];
  currentKey: string;
  onChange: (key: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const [saving, setSaving] = useState(false);
  const current = stages.find((s) => s.key === currentKey);

  async function handleChange(key: string) {
    if (key === currentKey) return;
    setSaving(true);
    try {
      await onChange(key);
    } finally {
      setSaving(false);
    }
  }

  if (stages.length === 0) return null;

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        className="input-field"
        value={currentKey}
        disabled={disabled || saving}
        onChange={(e) => handleChange(e.target.value)}
        style={{
          width: "auto",
          fontSize: size === "sm" ? 11 : 12,
          padding: size === "sm" ? "4px 8px" : "6px 10px",
          color: current?.color ?? "var(--text-secondary)",
          fontWeight: 700,
          borderColor: current?.color ?? "var(--border)",
          cursor: disabled ? "default" : "pointer",
        }}
        title="تغيير المرحلة"
      >
        {stages.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </select>
      {saving && (
        <span style={{ position: "absolute", left: -18 }}>
          <Icon name="clock" size={12} className="text-muted" />
        </span>
      )}
    </div>
  );
}
