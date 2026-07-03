"use client";

import Icon from "@/app/components/ui/Icon";
import type { EpisodeGalleryItem } from "@/app/lib/episode-gallery";
import { formatDuration, relativeTime } from "./utils";

export default function EpisodeGalleryCard({
  episode,
  active,
  onSelect,
}: {
  episode: EpisodeGalleryItem;
  active: boolean;
  onSelect: () => void;
}) {
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
        transition: "border-color .15s, box-shadow .15s, transform .15s",
      }}
    >
      <div
        style={{
          height: 120,
          position: "relative",
          background: episode.cover_image_url
            ? `center/cover no-repeat url(${episode.cover_image_url})`
            : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {!episode.cover_image_url && <Icon name="video" size={26} className="text-muted" />}

        {episode.number != null && (
          <span className="chip chip-gold" style={{ position: "absolute", top: 8, right: 8, fontSize: 11 }}>
            حلقة {episode.number}
          </span>
        )}
        <span
          className="chip"
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            fontSize: 11,
            color: episode.stageBadge.color,
            borderColor: episode.stageBadge.color,
            background: "rgba(0,0,0,0.5)",
          }}
        >
          {episode.stageBadge.label}
        </span>
        {episode.duration_seconds != null && (
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
            {formatDuration(episode.duration_seconds)}
          </span>
        )}
        {episode.hasActiveApproval && (
          <span style={{ position: "absolute", bottom: 8, right: 8, color: "#1DB954" }} title="معتمدة">
            <Icon name="badgeCheck" size={20} filled />
          </span>
        )}
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{episode.title}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
          {episode.type || "—"} · آخر تعديل {relativeTime(episode.updated_at)}
        </div>

        <div className="progress-bar" style={{ height: 5 }}>
          <div className="progress-fill" style={{ width: `${episode.progress}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, marginBottom: 10, fontSize: 11, color: "var(--text-muted)" }}>
          <span>{Math.round(episode.progress)}% مكتمل</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Icon name="user" size={11} /> {episode.assigned_to_name || "غير مسند"}
          </span>
        </div>

        <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Icon name="attachment" size={12} /> {episode.filesCount}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Icon name="message" size={12} /> {episode.notesCount}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Icon name="video" size={12} /> {episode.commentsCount}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <Icon name="fileCheck" size={12} /> {episode.versionsCount}
          </span>
        </div>
      </div>
    </button>
  );
}
