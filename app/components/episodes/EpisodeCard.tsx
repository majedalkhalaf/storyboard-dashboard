"use client";

import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { EPISODE_STATUSES } from "@/app/lib/constants";
import type { Episode } from "@/app/lib/types";

export default function EpisodeCard({ episode, projectId, stageCount }: { episode: Episode; projectId: string; stageCount?: number }) {
  const status = EPISODE_STATUSES.find((s) => s.value === episode.status);

  return (
    <Link href={`/projects/${projectId}/episodes/${episode.id}`} className="card animate-fade-in" style={{ display: "block", overflow: "hidden" }}>
      <div
        style={{
          height: 110,
          background: episode.cover_image_url
            ? `center/cover no-repeat url(${episode.cover_image_url})`
            : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid var(--border)",
          position: "relative",
        }}
      >
        {episode.number != null && (
          <span className="chip chip-gold" style={{ position: "absolute", top: 8, right: 8 }}>
            حلقة {episode.number}
          </span>
        )}
        {!episode.cover_image_url && <Icon name="video" size={26} className="text-muted" />}
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{episode.title}</div>
          {status && (
            <span className="chip" style={{ color: status.color, borderColor: status.color, flexShrink: 0 }}>
              {status.label}
            </span>
          )}
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${episode.progress}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
          <span>{Math.round(episode.progress)}% مكتمل</span>
          {stageCount != null && <span>{stageCount} مراحل</span>}
        </div>
      </div>
    </Link>
  );
}
