"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { getCompanyPipelineStages } from "@/app/lib/pipeline-stages";
import { reorderEpisodes } from "@/app/lib/episode-actions";
import { isSpecialEpisodeKind, type ItemNoun } from "@/app/lib/item-noun";
import type { EpisodeGalleryItem } from "@/app/lib/episode-gallery";
import type { CompanyPipelineStage } from "@/app/lib/types";
import EpisodeGalleryCard from "./EpisodeGalleryCard";

export default function EpisodeGallery({
  episodes,
  selectedId,
  onSelect,
  itemNoun,
  onReorder,
}: {
  episodes: EpisodeGalleryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  itemNoun: ItemNoun;
  /** اختياري — الأب (EpisodeWorkspace.tsx) لا يستهلكه حالياً؛ التعديل مملوك لعمل آخر جارٍ
   * على هذا الفرع فلم نُلزمه به. عند تمريره مستقبلاً يُستدعى بعد نجاح إعادة الترتيب. */
  onReorder?: (orderedIds: string[]) => void;
}) {
  const supabase = createClient();
  const { company } = useSession();
  const companyId = company!.id;

  // نسخة محلية مستقلة من ترتيب/محتوى الحلقات — تسمح بسحب وإفلات وتعديل فوري (عنوان،
  // مرحلة، رقم، غلاف، حذف) دون الحاجة لتمرير أي حالة جديدة عبر EpisodeWorkspace.tsx
  // (ملف مملوك لعمل آخر جارٍ على هذا الفرع، خارج نطاق هذه المهمة). تُعاد المزامنة مع
  // القائمة القادمة من الأب كلما تغيّرت مرجعياً (تحديث حقيقي من الخادم).
  const [items, setItems] = useState(episodes);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- مزامنة مع بيانات الأب عند تغيّرها فعلياً
    setItems(episodes);
  }, [episodes]);

  const [pipelineStages, setPipelineStages] = useState<CompanyPipelineStage[]>([]);
  useEffect(() => {
    getCompanyPipelineStages(supabase, companyId).then(setPipelineStages);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- تُجلب مرة واحدة لكل شركة، وليس عند كل تغيّر لعميل supabase
  }, [companyId]);

  const [dragId, setDragId] = useState<string | null>(null);

  function patchItem(id: string, patch: Partial<EpisodeGalleryItem>) {
    setItems((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((e) => e.id !== id));
  }

  async function dropOn(targetId: string) {
    const sourceId = dragId;
    setDragId(null);
    if (!sourceId || sourceId === targetId) return;
    const current = [...items];
    const fromIndex = current.findIndex((e) => e.id === sourceId);
    const toIndex = current.findIndex((e) => e.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const [moved] = current.splice(fromIndex, 1);
    current.splice(toIndex, 0, moved);
    setItems(current);
    const orderedIds = current.map((e) => e.id);
    await reorderEpisodes(supabase, orderedIds);
    onReorder?.(orderedIds);
  }

  if (items.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="video" size={30} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا توجد {itemNoun.plural} بعد</p>
      </div>
    );
  }

  const specialItems = items.filter((ep) => isSpecialEpisodeKind(ep.kind));
  const regularItems = items.filter((ep) => !isSpecialEpisodeKind(ep.kind));

  function renderCard(ep: EpisodeGalleryItem) {
    return (
      <EpisodeGalleryCard
        key={ep.id}
        episode={ep}
        active={ep.id === selectedId}
        onSelect={() => onSelect(ep.id)}
        pipelineStages={pipelineStages}
        itemNoun={itemNoun}
        onChanged={(patch) => patchItem(ep.id, patch)}
        onDeleted={() => removeItem(ep.id)}
        dimmed={dragId !== null && dragId !== ep.id}
        onDragStartHandle={() => setDragId(ep.id)}
        onDragEndHandle={() => setDragId(null)}
        onCardDragOver={(e) => {
          if (dragId) e.preventDefault();
        }}
        onCardDrop={(e) => {
          e.preventDefault();
          dropOn(ep.id);
        }}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {specialItems.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: 0.4 }}>
            المقدمة والمقاطع الخاصة
          </span>
          {specialItems.map(renderCard)}
        </div>
      )}
      {regularItems.length > 0 && (
        <div className="episode-gallery-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {regularItems.map(renderCard)}
        </div>
      )}
    </div>
  );
}
