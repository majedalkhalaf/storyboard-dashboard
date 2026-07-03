"use client";

import Icon from "@/app/components/ui/Icon";
import { STORYBOARD_SCENE_STATUSES } from "@/app/lib/constants";
import type { StoryboardSceneListItem } from "@/app/lib/storyboard";

export default function SceneListSidebar({
  scenes,
  selectedId,
  onSelect,
}: {
  scenes: StoryboardSceneListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 4, maxHeight: 560, overflowY: "auto" }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 6 }}>المشاهد ({scenes.length})</h3>
      {scenes.map((s) => {
        const status = STORYBOARD_SCENE_STATUSES.find((st) => st.value === s.status);
        const active = s.id === selectedId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="btn-ghost"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 8,
              textAlign: "right",
              background: active ? "rgba(var(--gold-rgb),0.1)" : "transparent",
              color: active ? "var(--gold)" : "var(--text-primary)",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", flexShrink: 0, width: 20 }}>
              {s.number != null ? String(s.number).padStart(2, "0") : "—"}
            </span>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: status?.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {s.title}
            </span>
            <Icon name="chevronLeft" size={13} className="text-muted" />
          </button>
        );
      })}
    </div>
  );
}
