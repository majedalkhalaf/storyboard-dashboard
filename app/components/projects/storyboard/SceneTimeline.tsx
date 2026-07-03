"use client";

import Icon from "@/app/components/ui/Icon";
import type { StoryboardSceneListItem } from "@/app/lib/storyboard";
import { formatDuration } from "../utils";

export default function SceneTimeline({
  scenes,
  selectedId,
  onSelect,
}: {
  scenes: StoryboardSceneListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (scenes.length === 0) return null;

  const totalSeconds = scenes.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="timeline" size={14} /> Timeline
        </h3>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>المدة الإجمالية: {formatDuration(totalSeconds)}</span>
      </div>

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {scenes.map((s) => {
          const active = s.id === selectedId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.id)}
              style={{
                flexShrink: 0,
                width: 96,
                textAlign: "right",
                cursor: "pointer",
                border: `1px solid ${active ? "var(--gold)" : "var(--border)"}`,
                borderRadius: 10,
                overflow: "hidden",
                background: "var(--bg-card)",
              }}
            >
              <div
                style={{
                  height: 54,
                  background: s.cover_image_url
                    ? `center/cover no-repeat url(${s.cover_image_url})`
                    : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
                }}
              />
              <div style={{ padding: "5px 7px" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: active ? "var(--gold)" : "var(--text-primary)" }}>
                  {s.number != null ? String(s.number).padStart(2, "0") : "—"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{formatDuration(s.duration_seconds)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
