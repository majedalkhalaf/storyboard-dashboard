"use client";

import type { EpisodeFullDetail } from "@/app/lib/episode-detail";

export default function ScriptTab({
  episode,
}: {
  episode: EpisodeFullDetail;
  onChanged: (patch: Partial<EpisodeFullDetail>) => void;
}) {
  return (
    <div className="empty-state card">
      <p>تبويب السكربت والسيناريو قيد الإنشاء لهذه الحلقة ({episode.title}).</p>
    </div>
  );
}
