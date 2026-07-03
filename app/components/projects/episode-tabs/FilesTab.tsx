"use client";

import FilesPanel from "../FilesPanel";
import type { EpisodeFullDetail } from "@/app/lib/episode-detail";

export default function FilesTab({
  episode,
  onChanged,
}: {
  episode: EpisodeFullDetail;
  onChanged: () => void;
}) {
  return <FilesPanel projectId={episode.project_id} episodeId={episode.id} filter="all" emptyText="لا توجد ملفات لهذه الحلقة" onChanged={onChanged} />;
}
