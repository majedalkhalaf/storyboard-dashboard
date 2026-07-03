"use client";

import type { EpisodeFullDetail } from "@/app/lib/episode-detail";

export default function AssetsTab({
  episode,
}: {
  episode: EpisodeFullDetail;
  onChanged: () => void;
}) {
  return (
    <div className="empty-state card">
      <p>تبويب الأصول (شعارات/خطوط/موسيقى...) قيد الإنشاء لهذه الحلقة ({episode.title}).</p>
    </div>
  );
}
