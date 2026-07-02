"use client";

import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { EPISODE_STATUSES } from "@/app/lib/constants";
import { relativeTime } from "@/app/components/projects/utils";
import type { EpisodeStatus } from "@/app/lib/types";

export interface EpisodeListItem {
  id: string;
  project_id: string;
  number: number | null;
  title: string;
  cover_image_url: string | null;
  status: EpisodeStatus;
  progress: number;
  updated_at: string;
  project_name: string;
  client_name: string | null;
}

export default function EpisodeListCard({ episode }: { episode: EpisodeListItem }) {
  const status = EPISODE_STATUSES.find((s) => s.value === episode.status);

  return (
    <Link
      href={`/projects/${episode.project_id}/episodes/${episode.id}`}
      className="card animate-fade-in"
      style={{ display: "block", overflow: "hidden" }}
    >
      <div
        style={{
          height: 120,
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
        {status && (
          <span
            className="chip"
            style={{ position: "absolute", top: 8, left: 8, color: status.color, borderColor: status.color }}
          >
            {status.label}
          </span>
        )}
        {!episode.cover_image_url && <Icon name="video" size={28} className="text-muted" />}
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{episode.title}</div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Icon name="projects" size={12} />
          {episode.project_name}
          {episode.client_name ? ` · ${episode.client_name}` : ""}
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${episode.progress}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
          <span>{Math.round(episode.progress)}% مكتمل</span>
          <span>{relativeTime(episode.updated_at)}</span>
        </div>
      </div>
    </Link>
  );
}
