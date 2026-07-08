"use client";

import ActivityTimeline from "../ActivityTimeline";
import type { EpisodeFullDetail } from "@/app/lib/episode-detail";

export default function ActivityTab({ episode }: { episode: EpisodeFullDetail }) {
  return (
    <div className="card animate-fade-in" style={{ padding: "6px 14px" }}>
      <ActivityTimeline items={episode.activity} limit={8} />
    </div>
  );
}
