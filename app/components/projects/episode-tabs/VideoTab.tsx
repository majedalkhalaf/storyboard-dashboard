"use client";

import type { EpisodeFullDetail } from "@/app/lib/episode-detail";

export default function VideoTab({
  episode,
}: {
  episode: EpisodeFullDetail;
  onChanged: () => void;
}) {
  return (
    <div className="empty-state card">
      <p>تبويب الفيديو قيد الإنشاء لهذه الحلقة ({episode.title}).</p>
    </div>
  );
}
