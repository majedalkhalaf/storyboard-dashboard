"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { CAST_ROLE_LABELS } from "@/app/lib/constants";
import type { StoryboardCastRole } from "@/app/lib/types";
import type { StoryboardSceneFullDetail } from "@/app/lib/storyboard-detail";

const ROLE_VALUES = Object.keys(CAST_ROLE_LABELS) as StoryboardCastRole[];

// قائمة CRUD بسيطة لأشخاص المشهد (storyboard_scene_cast) مجمّعة حسب role_type للعرض فقط.
export default function SceneCastSection({
  scene,
  onChanged,
}: {
  scene: StoryboardSceneFullDetail;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const { company } = useSession();
  const companyId = company!.id;

  const [roleType, setRoleType] = useState<StoryboardCastRole>("character");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function addEntry() {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await supabase.from("storyboard_scene_cast").insert({
        company_id: companyId,
        scene_id: scene.id,
        role_type: roleType,
        name: name.trim(),
        notes: notes.trim() || null,
      });
      setName("");
      setNotes("");
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await supabase.from("storyboard_scene_cast").delete().eq("id", id);
    onChanged();
  }

  const grouped = ROLE_VALUES.map((role) => ({
    role,
    entries: scene.cast.filter((c) => c.role_type === role),
  })).filter((g) => g.entries.length > 0);

  return (
    <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 800 }}>الممثلون/الطاقم</h3>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ minWidth: 130 }}>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>الدور</label>
          <select className="input-field" value={roleType} onChange={(e) => setRoleType(e.target.value as StoryboardCastRole)}>
            {ROLE_VALUES.map((role) => (
              <option key={role} value={role}>
                {CAST_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>الاسم</label>
          <input
            className="input-field"
            placeholder="اسم الشخصية/الممثل"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEntry()}
          />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>ملاحظات (اختياري)</label>
          <input
            className="input-field"
            placeholder="ملاحظات..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEntry()}
          />
        </div>
        <button className="btn btn-gold" disabled={saving || !name.trim()} onClick={addEntry}>
          <Icon name="plus" size={15} /> إضافة
        </button>
      </div>

      {grouped.length === 0 ? (
        <div className="empty-state">
          <Icon name="user" size={28} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا يوجد ممثلون/طاقم مضافون لهذا المشهد بعد</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {grouped.map(({ role, entries }) => (
            <div key={role}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 8 }}>{CAST_ROLE_LABELS[role]}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {entries.map((c) => (
                  <div
                    key={c.id}
                    className="card"
                    style={{ padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                      {c.notes && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{c.notes}</div>}
                    </div>
                    <button className="btn-ghost" style={{ padding: "6px 8px", borderRadius: 8, color: "#ef4444", flexShrink: 0 }} onClick={() => remove(c.id)}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
