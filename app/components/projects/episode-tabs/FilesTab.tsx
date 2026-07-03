"use client";

import FilesPanel from "../FilesPanel";
import VideoTab from "./VideoTab";
import type { EpisodeFullDetail } from "@/app/lib/episode-detail";

// تبويب "الفيديو" مدمج هنا فوق قائمة الملفات العامة (لا يحتاج تبويباً مستقلاً) — مشغّل
// الفيديو المخصّص بتعليقات موقوتة ونسخ سابقة يبقى كما هو، فقط ضمن نفس مساحة "الملفات".
export default function FilesTab({
  episode,
  onChanged,
}: {
  episode: EpisodeFullDetail;
  onChanged: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <VideoTab episode={episode} onChanged={onChanged} />
      <FilesPanel projectId={episode.project_id} episodeId={episode.id} filter="all" emptyText="لا توجد ملفات لهذه الحلقة" onChanged={onChanged} />
    </div>
  );
}
