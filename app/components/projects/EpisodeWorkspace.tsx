"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Tabs, { type TabDef } from "@/app/components/ui/Tabs";
import { useSession } from "@/app/providers/SessionProvider";
import { fetchEpisodeDetail, type EpisodeFullDetail } from "@/app/lib/episode-detail";
import type { EpisodeGalleryItem } from "@/app/lib/episode-gallery";
import EpisodeGallery from "./EpisodeGallery";
import EpisodeSidebar from "./EpisodeSidebar";
import OverviewTab from "./episode-tabs/OverviewTab";
import ScriptTab from "./episode-tabs/ScriptTab";
import FilesTab from "./episode-tabs/FilesTab";
import VideoTab from "./episode-tabs/VideoTab";
import NotesTab from "./episode-tabs/NotesTab";
import StagesTab from "./episode-tabs/StagesTab";
import AssetsTab from "./episode-tabs/AssetsTab";
import ActivityTab from "./episode-tabs/ActivityTab";
import StoryboardTab from "./storyboard/StoryboardTab";

type TabKey = "overview" | "script" | "storyboard" | "files" | "video" | "notes" | "stages" | "assets" | "activity";

const TABS: TabDef<TabKey>[] = [
  { key: "overview", label: "نظرة عامة", icon: "info" },
  { key: "script", label: "السكربت", icon: "fileCheck" },
  { key: "storyboard", label: "ستوري بورد", icon: "palette" },
  { key: "files", label: "الملفات", icon: "attachment" },
  { key: "video", label: "الفيديو", icon: "video" },
  { key: "notes", label: "الملاحظات", icon: "message" },
  { key: "stages", label: "مراحل التنفيذ", icon: "timeline" },
  { key: "assets", label: "الأصول", icon: "palette" },
  { key: "activity", label: "سجل النشاط", icon: "clock" },
];

export default function EpisodeWorkspace({
  clientName,
  gallery,
  initialEpisodeId,
}: {
  clientName: string | null;
  gallery: EpisodeGalleryItem[];
  initialEpisodeId: string | null;
}) {
  const { company } = useSession();
  const companyId = company!.id;

  const [galleryItems, setGalleryItems] = useState(gallery);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- مزامنة مع بيانات المعرض القادمة من السيرفر (بعد router.refresh() مثلاً)
    setGalleryItems(gallery);
  }, [gallery]);

  const [selectedId, setSelectedId] = useState<string | null>(initialEpisodeId ?? gallery[0]?.id ?? null);
  const [detail, setDetail] = useState<EpisodeFullDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(selectedId));
  const [tab, setTab] = useState<TabKey>("overview");
  const latestRequestRef = useRef<string | null>(null);

  const load = useCallback(
    async (id: string) => {
      latestRequestRef.current = id;
      setLoading(true);
      const d = await fetchEpisodeDetail(id, companyId);
      if (latestRequestRef.current === id) {
        setDetail(d);
        setLoading(false);
      }
    },
    [companyId]
  );

  useEffect(() => {
    if (!selectedId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- تحميل تفاصيل الحلقة عند اختيارها فقط (lazy load)، النمط القياسي في هذا المشروع
    load(selectedId);
  }, [selectedId, load]);

  function selectEpisode(id: string) {
    setSelectedId(id);
    setTab("overview");
    const url = new URL(window.location.href);
    url.searchParams.set("episode", id);
    window.history.replaceState(null, "", url.toString());
  }

  function applyPatch(patch: Partial<EpisodeFullDetail>) {
    setDetail((prev) => (prev ? { ...prev, ...patch } : prev));
    if ("cover_image_url" in patch && selectedId) {
      setGalleryItems((prev) => prev.map((e) => (e.id === selectedId ? { ...e, cover_image_url: patch.cover_image_url ?? null } : e)));
    }
  }

  const activeGalleryItem = galleryItems.find((e) => e.id === selectedId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>الحلقات</h2>
        <EpisodeGallery episodes={galleryItems} selectedId={selectedId} onSelect={selectEpisode} />
      </div>

      {selectedId && (
        <div className="animate-fade-in">
          <div className="tabs-scroll-wrap" style={{ marginBottom: 16 }}>
            <Tabs
              tabs={TABS.map((t) => ({
                ...t,
                badge:
                  t.key === "files"
                    ? activeGalleryItem?.filesCount
                    : t.key === "notes"
                      ? (activeGalleryItem?.notesCount ?? 0) + (activeGalleryItem?.commentsCount ?? 0)
                      : t.key === "script"
                        ? activeGalleryItem?.versionsCount
                        : undefined,
              }))}
              active={tab}
              onChange={setTab}
            />
          </div>

          {loading || !detail ? (
            <WorkspaceSkeleton />
          ) : tab === "storyboard" ? (
            // ستوري بورد له تخطيطه الداخلي الخاص (معرض + لوحة تفاصيل + شريط مشاهد جانبي + Timeline)
            // فلا حاجة للشريط الجانبي العام للحلقة هنا — يأخذ العرض الكامل.
            <div className="animate-fade-in">
              <StoryboardTab episode={detail} onChanged={() => fetchEpisodeDetail(detail.id, companyId).then(setDetail)} />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20, alignItems: "flex-start" }}>
              <div className="animate-fade-in">
                {tab === "overview" && <OverviewTab episode={detail} onChanged={applyPatch} />}
                {tab === "script" && <ScriptTab episode={detail} onChanged={applyPatch} />}
                {tab === "files" && <FilesTab episode={detail} onChanged={() => fetchEpisodeDetail(detail.id, companyId).then(setDetail)} />}
                {tab === "video" && <VideoTab episode={detail} onChanged={() => fetchEpisodeDetail(detail.id, companyId).then(setDetail)} />}
                {tab === "notes" && <NotesTab episode={detail} onChanged={() => fetchEpisodeDetail(detail.id, companyId).then(setDetail)} />}
                {tab === "stages" && <StagesTab episode={detail} onChanged={applyPatch} />}
                {tab === "assets" && <AssetsTab episode={detail} onChanged={() => fetchEpisodeDetail(detail.id, companyId).then(setDetail)} />}
                {tab === "activity" && <ActivityTab episode={detail} />}
              </div>
              <EpisodeSidebar episode={detail} clientName={clientName} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="skeleton" style={{ height: 90, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 140, borderRadius: 14 }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="skeleton" style={{ height: 220, borderRadius: 14 }} />
      </div>
    </div>
  );
}
