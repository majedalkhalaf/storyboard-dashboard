"use client";

import Icon from "@/app/components/ui/Icon";
import { STORYBOARD_SCENE_STATUSES } from "@/app/lib/constants";
import type { StoryboardSceneListItem } from "@/app/lib/storyboard";
import { formatDuration } from "../utils";

export default function SceneCard({
  scene,
  active,
  onSelect,
}: {
  scene: StoryboardSceneListItem;
  active: boolean;
  onSelect: () => void;
}) {
  const status = STORYBOARD_SCENE_STATUSES.find((s) => s.value === scene.status);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="card animate-fade-in"
      style={{
        display: "block",
        textAlign: "right",
        overflow: "hidden",
        cursor: "pointer",
        padding: 0,
        borderColor: active ? "var(--gold)" : "var(--border)",
        boxShadow: active ? "0 0 0 1px var(--gold)" : "none",
        transition: "border-color .15s, box-shadow .15s",
      }}
    >
      <div
        style={{
          height: 110,
          position: "relative",
          background: scene.cover_image_url
            ? `center/cover no-repeat url(${scene.cover_image_url})`
            : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!scene.cover_image_url && <Icon name="image" size={22} className="text-muted" />}

        {scene.number != null && (
          <span className="chip chip-gold" style={{ position: "absolute", top: 8, right: 8, fontSize: 11 }}>
            {String(scene.number).padStart(2, "0")}
          </span>
        )}
        {scene.duration_seconds != null && (
          <span
            style={{
              position: "absolute",
              bottom: 8,
              left: 8,
              fontSize: 11,
              padding: "2px 7px",
              borderRadius: 6,
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
            }}
          >
            {formatDuration(scene.duration_seconds)}
          </span>
        )}
      </div>

      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {scene.title}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {scene.shot_type || "—"} {scene.location ? `· ${scene.location}` : ""}
        </div>

        <div className="progress-bar" style={{ height: 4 }}>
          <div className="progress-fill" style={{ width: `${scene.progress}%`, background: status?.color }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          {status && (
            <span className="chip" style={{ color: status.color, borderColor: status.color, fontSize: 10 }}>
              {status.label}
            </span>
          )}
          <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Icon name="message" size={11} /> {scene.notesCount}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Icon name="attachment" size={11} /> {scene.filesCount}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Icon name="user" size={11} /> {scene.castCount}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Icon name="equipment" size={11} /> {scene.equipmentCount}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
