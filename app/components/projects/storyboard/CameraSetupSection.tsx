"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { CAMERA_SETUP_FIELDS } from "@/app/lib/constants";
import type { CameraSetup } from "@/app/lib/types";
import type { StoryboardSceneFullDetail } from "@/app/lib/storyboard-detail";

// حقول لها مفردات ثابتة صغيرة تستحق قائمة اختيار + إدخال حر (نفس نمط SelectOrCustomField
// في SceneDetailPanel لحقل "نوع اللقطة") — بقية الحقول (نوع الكاميرا/العدسة/الفتحة...)
// نص حر بسيط فقط، لا داعي لتحويلها كلها إلى قوائم منسدلة.
const SELECT_FIELD_OPTIONS: Record<string, string[]> = {
  frame_rate: ["24fps", "25fps", "30fps", "50fps", "60fps"],
  resolution: ["4K", "1080p", "6K", "8K"],
  white_balance: ["Auto", "Daylight", "Tungsten", "Custom Kelvin"],
};

export default function CameraSetupSection({
  scene,
  onChanged,
}: {
  scene: StoryboardSceneFullDetail;
  onChanged: (patch: Partial<StoryboardSceneFullDetail>) => void;
}) {
  const supabase = createClient();
  const cameraSetup = (scene.camera_setup ?? {}) as Record<string, string | undefined>;

  async function saveField(key: string, value: string) {
    const next: CameraSetup = { ...scene.camera_setup, [key]: value };
    onChanged({ camera_setup: next });
    await supabase.from("storyboard_scenes").update({ camera_setup: next }).eq("id", scene.id);
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Camera Setup</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {CAMERA_SETUP_FIELDS.map((field) => {
          const value = cameraSetup[field.key] ?? "";
          const options = SELECT_FIELD_OPTIONS[field.key];
          return options ? (
            <SelectOrCustomField key={field.key} label={field.label} value={value} options={options} onSave={(v) => saveField(field.key, v)} />
          ) : (
            <TextField key={field.key} label={field.label} value={value} onSave={(v) => saveField(field.key, v)} />
          );
        })}
      </div>
    </div>
  );
}

function TextField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>{label}</label>
      <input className="input-field" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onSave(v)} style={{ fontSize: 13 }} />
    </div>
  );
}

function SelectOrCustomField({ label, value, options, onSave }: { label: string; value: string; options: string[]; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  const listId = `camera-setup-${label}`;
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>{label}</label>
      <input
        className="input-field"
        list={listId}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v)}
        style={{ fontSize: 13 }}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  );
}
