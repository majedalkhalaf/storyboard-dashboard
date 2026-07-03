"use client";

import ActivityTimeline from "../ActivityTimeline";
import type { EpisodeFullDetail } from "@/app/lib/episode-detail";

export default function ActivityTab({ episode }: { episode: EpisodeFullDetail }) {
  return <ActivityTimeline items={episode.activity} />;
}
