"use client";

import Icon from "@/app/components/ui/Icon";
import type { StoryboardSceneListItem } from "@/app/lib/storyboard";
import SceneCard from "./SceneCard";

export default function SceneGallery({
  scenes,
  selectedId,
  onSelect,
  onCreate,
  creating,
}: {
  scenes: StoryboardSceneListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>معرض المشاهد ({scenes.length})</h2>
        <button className="btn btn-gold" style={{ padding: "8px 14px", fontSize: 12 }} onClick={onCreate} disabled={creating}>
          <Icon name="plus" size={14} /> {creating ? "جارٍ الإضافة..." : "مشهد جديد"}
        </button>
      </div>

      {scenes.length === 0 ? (
        <div className="empty-state card">
          <Icon name="palette" size={30} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد مشاهد في Storyboard هذه الحلقة بعد</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {scenes.map((s) => (
            <SceneCard key={s.id} scene={s} active={s.id === selectedId} onSelect={() => onSelect(s.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
