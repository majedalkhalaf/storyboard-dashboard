"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { getStoryboardScenes, type StoryboardSceneListItem } from "@/app/lib/storyboard";
import { fetchSceneDetail, type StoryboardSceneFullDetail } from "@/app/lib/storyboard-detail";
import type { EpisodeFullDetail } from "@/app/lib/episode-detail";
import SceneGallery from "./SceneGallery";
import SceneListSidebar from "./SceneListSidebar";
import SceneDetailPanel from "./SceneDetailPanel";
import SceneTimeline from "./SceneTimeline";
import NewSceneModal from "./NewSceneModal";

// Storyboard كل حلقة مستقل بالكامل — لا يُجلب إلا عند تفعيل هذا التبويب لأول مرة (lazy)،
// وتفاصيل كل مشهد (كاميرا/إخراج/مرفقات/ملاحظات...) تُجلب فقط عند اختيار ذلك المشهد تحديداً.
export default function StoryboardTab({ episode }: { episode: EpisodeFullDetail; onChanged: () => void }) {
  const supabase = createClient();

  const [scenes, setScenes] = useState<StoryboardSceneListItem[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StoryboardSceneFullDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showNewSceneModal, setShowNewSceneModal] = useState(false);
  const latestRequestRef = useRef<string | null>(null);

  const loadScenes = useCallback(async () => {
    const list = await getStoryboardScenes(episode.id);
    setScenes(list);
    return list;
  }, [episode.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل قائمة المشاهد فقط عند تفعيل تبويب Storyboard لأول مرة لهذه الحلقة (lazy load)
    loadScenes();
  }, [loadScenes]);

  const loadDetail = useCallback(async (id: string) => {
    latestRequestRef.current = id;
    setDetailLoading(true);
    const d = await fetchSceneDetail(id);
    if (latestRequestRef.current === id) {
      setDetail(d);
      setDetailLoading(false);
    }
  }, []);

  function selectScene(id: string) {
    setSelectedId(id);
    loadDetail(id);
  }

  function patchDetail(patch: Partial<StoryboardSceneFullDetail>) {
    setDetail((prev) => (prev ? { ...prev, ...patch } : prev));
    if (selectedId) {
      setScenes((prev) =>
        prev
          ? prev.map((s) =>
              s.id === selectedId
                ? {
                    ...s,
                    ...(patch.title !== undefined ? { title: patch.title } : {}),
                    ...(patch.status !== undefined ? { status: patch.status } : {}),
                    ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
                    ...(patch.cover_image_url !== undefined ? { cover_image_url: patch.cover_image_url } : {}),
                    ...(patch.duration_seconds !== undefined ? { duration_seconds: patch.duration_seconds } : {}),
                    ...(patch.shot_type !== undefined ? { shot_type: patch.shot_type } : {}),
                    ...(patch.location !== undefined ? { location: patch.location } : {}),
                  }
                : s
            )
          : prev
      );
    }
  }

  async function handleSceneCreated(sceneId: string) {
    await loadScenes();
    setSelectedId(sceneId);
    loadDetail(sceneId);
  }

  async function deleteScene() {
    if (!detail) return;
    if (!confirm(`حذف المشهد "${detail.title}"؟`)) return;
    await supabase.from("storyboard_scenes").delete().eq("id", detail.id);
    setSelectedId(null);
    setDetail(null);
    await loadScenes();
  }

  if (scenes === null) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="skeleton" style={{ height: 140, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 140, borderRadius: 14 }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SceneGallery scenes={scenes} selectedId={selectedId} onSelect={selectScene} onCreate={() => setShowNewSceneModal(true)} />

      {selectedId && (
        <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, alignItems: "flex-start" }}>
          {detailLoading || !detail ? (
            <div className="skeleton" style={{ height: 320, borderRadius: 14 }} />
          ) : (
            <SceneDetailPanel scene={detail} onChanged={patchDetail} onRefetch={() => loadDetail(detail.id)} onDelete={deleteScene} />
          )}
          <SceneListSidebar scenes={scenes} selectedId={selectedId} onSelect={selectScene} />
        </div>
      )}

      <SceneTimeline scenes={scenes} selectedId={selectedId} onSelect={selectScene} />

      {showNewSceneModal && (
        <NewSceneModal
          episodeId={episode.id}
          nextNumber={(scenes?.length ?? 0) + 1}
          onClose={() => setShowNewSceneModal(false)}
          onCreated={handleSceneCreated}
        />
      )}
    </div>
  );
}
