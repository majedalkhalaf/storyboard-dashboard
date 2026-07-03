"use client";

import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { DIRECTOR_NOTES_FIELDS } from "@/app/lib/constants";
import type { DirectorNotes } from "@/app/lib/types";
import type { StoryboardSceneFullDetail } from "@/app/lib/storyboard-detail";

// كل الحقول هنا نصية حرة/إرشادية للمخرج (إحساس، إضاءة، انتقال...) وليست مفردات ثابتة
// كحقول الكاميرا التقنية، لذا نستخدم textarea قصير للجميع بدل قوائم منسدلة.
export default function DirectorNotesSection({
  scene,
  onChanged,
}: {
  scene: StoryboardSceneFullDetail;
  onChanged: (patch: Partial<StoryboardSceneFullDetail>) => void;
}) {
  const supabase = createClient();
  const directorNotes = (scene.director_notes ?? {}) as Record<string, string | undefined>;

  async function saveField(key: string, value: string) {
    const next: DirectorNotes = { ...scene.director_notes, [key]: value };
    onChanged({ director_notes: next });
    await supabase.from("storyboard_scenes").update({ director_notes: next }).eq("id", scene.id);
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>ملاحظات الإخراج</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        {DIRECTOR_NOTES_FIELDS.map((field) => (
          <NoteField key={field.key} label={field.label} value={directorNotes[field.key] ?? ""} onSave={(v) => saveField(field.key, v)} />
        ))}
      </div>
    </div>
  );
}

function NoteField({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>{label}</label>
      <textarea
        className="input-field"
        rows={2}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v)}
        style={{ resize: "vertical", fontSize: 13 }}
      />
    </div>
  );
}
