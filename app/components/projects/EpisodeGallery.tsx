"use client";

import Icon from "@/app/components/ui/Icon";
import type { EpisodeGalleryItem } from "@/app/lib/episode-gallery";
import EpisodeGalleryCard from "./EpisodeGalleryCard";

export default function EpisodeGallery({
  episodes,
  selectedId,
  onSelect,
}: {
  episodes: EpisodeGalleryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (episodes.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="video" size={30} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا توجد حلقات بعد</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
      {episodes.map((ep) => (
        <EpisodeGalleryCard key={ep.id} episode={ep} active={ep.id === selectedId} onSelect={() => onSelect(ep.id)} />
      ))}
    </div>
  );
}
