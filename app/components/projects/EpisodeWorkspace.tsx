"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Tabs, { type TabDef } from "@/app/components/ui/Tabs";
import Icon from "@/app/components/ui/Icon";
import EditableTitle from "@/app/components/ui/EditableTitle";
import ZipExportButton from "@/app/components/ui/ZipExportButton";
import StageQuickSelect from "./StageQuickSelect";
import { useSession } from "@/app/providers/SessionProvider";
import { createClient } from "@/app/lib/supabase/client";
import { fetchEpisodeDetail, type EpisodeFullDetail } from "@/app/lib/episode-detail";
import type { EpisodeGalleryItem } from "@/app/lib/episode-gallery";
import type { CompanyPipelineStage } from "@/app/lib/types";
import { getCompanyPipelineStages } from "@/app/lib/pipeline-stages";
import { updateEpisodeTitle, updateEpisodePipelineStage } from "@/app/lib/episode-actions";
import { exportEpisodeZip } from "@/app/lib/zip-export";
import EpisodeGallery from "./EpisodeGallery";
import EpisodeSidebar from "./EpisodeSidebar";
import OverviewTab from "./episode-tabs/OverviewTab";
import ScriptTab from "./episode-tabs/ScriptTab";
import FilesTab from "./episode-tabs/FilesTab";
import NotesTab from "./episode-tabs/NotesTab";
import StagesTab from "./episode-tabs/StagesTab";
import ActivityTab from "./episode-tabs/ActivityTab";
import StoryboardTab from "./storyboard/StoryboardTab";

// دُمج تبويبا "الفيديو" و"الأصول" السابقان داخل "الملفات": الفيديو أصبح قسماً أعلى قائمة
// الملفات في FilesTab.tsx (نفس مشغّل الفيديو والتعليقات الموقوتة، بلا تبويب مستقل)،
// والأصول أُزيل نهائياً لأنه كان بالحرف نفس ملفات "الملفات" مُجمّعة حسب التصنيف فقط —
// وتصنيف/تحميل الملفات متاح بالفعل من داخل تبويب الملفات نفسه.
type TabKey = "overview" | "script" | "storyboard" | "files" | "notes" | "stages" | "activity";

const TABS: TabDef<TabKey>[] = [
  { key: "overview", label: "نظرة عامة", icon: "info" },
  { key: "script", label: "السكربت", icon: "fileCheck" },
  { key: "storyboard", label: "ستوري بورد", icon: "palette" },
  { key: "files", label: "الملفات", icon: "attachment" },
  { key: "notes", label: "الملاحظات", icon: "message" },
  { key: "stages", label: "مراحل التنفيذ", icon: "timeline" },
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
  const supabase = createClient();

  const [pipelineStages, setPipelineStages] = useState<CompanyPipelineStage[]>([]);
  useEffect(() => {
    getCompanyPipelineStages(supabase, companyId).then(setPipelineStages);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- يُجلب مرة واحدة لكل شركة
  }, [companyId]);

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
    if (selectedId && ("cover_image_url" in patch || "title" in patch)) {
      setGalleryItems((prev) =>
        prev.map((e) =>
          e.id === selectedId
            ? {
                ...e,
                ...("cover_image_url" in patch ? { cover_image_url: patch.cover_image_url ?? null } : {}),
                ...("title" in patch ? { title: patch.title ?? e.title } : {}),
              }
            : e
        )
      );
    }
  }

  async function saveTitle(next: string) {
    if (!detail) return;
    const oldTitle = detail.title;
    applyPatch({ title: next });
    await updateEpisodeTitle(supabase, { companyId, projectId: detail.project_id, episodeId: detail.id, oldTitle, newTitle: next });
  }

  async function saveStage(key: string) {
    if (!detail) return;
    const label = pipelineStages.find((s) => s.key === key)?.label ?? key;
    applyPatch({ pipeline_stage: key });
    await updateEpisodePipelineStage(supabase, { companyId, projectId: detail.project_id, episodeId: detail.id, stageKey: key, stageLabel: label });
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
          {detail && (
            <div
              className="card"
              style={{
                padding: "12px 16px",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                {detail.number != null && (
                  <span className="chip chip-gold" style={{ fontSize: 11, flexShrink: 0 }}>
                    حلقة {detail.number}
                  </span>
                )}
                <EditableTitle value={detail.title} onSave={saveTitle} fontSize={16} maxWidth={420} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-muted)" }}>
                  <Icon name="zap" size={12} /> المرحلة
                </span>
                <StageQuickSelect stages={pipelineStages} currentKey={detail.pipeline_stage} onChange={saveStage} size="sm" />
                <ZipExportButton
                  label="تصدير الحلقة ZIP"
                  icon="archive"
                  run={(onProgress) => exportEpisodeZip(supabase, companyId, detail.id, onProgress)}
                />
              </div>
            </div>
          )}

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
                {tab === "notes" && <NotesTab episode={detail} onChanged={() => fetchEpisodeDetail(detail.id, companyId).then(setDetail)} />}
                {tab === "stages" && <StagesTab episode={detail} onChanged={applyPatch} />}
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
