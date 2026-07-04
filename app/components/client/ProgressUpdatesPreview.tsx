"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import ProgressUpdateCard, { type ClientProgressUpdate } from "@/app/components/client/ProgressUpdateCard";
import MediaCrossfadeSlot from "@/app/components/client/MediaCrossfadeSlot";
import { useRandomSlideIndex, SLOT_SIZE, SLOT_COUNT } from "@/app/components/client/randomSlideshow";
import { useIsMobile } from "@/app/lib/useIsMobile";
import { PROGRESS_UPDATE_STAGES } from "@/app/lib/constants";
import { relativeTime, projectHashtag } from "@/app/components/client/utils";
import { createClient } from "@/app/lib/supabase/client";
import type { ProgressUpdateMediaItem } from "@/app/lib/types";

// نطاق أوسع من التحديثات/الوسائط — مسبح عشوائي للتبديل، نفس منطق شريط الكواليس.
const MAX_UPDATES_SCANNED = 8;
const MAX_MEDIA_CARDS = 20;

interface StripMediaCard {
  key: string;
  update: ClientProgressUpdate;
  media: ProgressUpdateMediaItem | null;
}

// نفس منطق تفكيك منشورات الكواليس: بطاقة واحدة لكل صورة/فيديو (باستثناء
// صور "قبل" كي لا تظهر مكرَّرة بمعزل عن مقارنتها) بدل بطاقة غلاف واحدة لكل
// تحديث — كي يغذّي مسبح التبديل العشوائي بخيارات أكثر.
function flattenUpdatesToMediaCards(updates: ClientProgressUpdate[]): StripMediaCard[] {
  const out: StripMediaCard[] = [];
  for (const update of updates.slice(0, MAX_UPDATES_SCANNED)) {
    const media = update.media.filter((m) => m.label !== "before");
    const list = media.length > 0 ? media : [null];
    for (const m of list) {
      if (out.length >= MAX_MEDIA_CARDS) return out;
      out.push({ key: `${update.id}-${m?.url ?? "none"}`, update, media: m });
    }
  }
  return out;
}

// يستمع لأي تحديث "عمل جارٍ" جديد مشترك عبر كل مشاريع العميل ويعيد جلب بيانات
// الصفحة الرئيسية — نفس نمط useBehindScenesRealtime (بلا فلترة على مستوى
// القناة لأن Realtime لا يدعم فلترة project_id ضمن قائمة).
function useProgressUpdatesRealtime() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("client-progress-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "progress_updates" }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router مستقر عبر عمر المكوّن
  }, []);
}

// شريط "العمل الجاري" — بنفس أسلوب شريط الكواليس تماماً: خانات ثابتة المكان
// بحجم موحّد، تتبدّل صورة كل خانة عشوائياً بتلاشٍ سينمائي هادئ (Crossfade)
// بدل حركة تمرير أو قفزة مفاجئة. الضغط على أي خانة يفتح التحديث كاملاً
// بجودته الأصلية (بما فيها سلايدر المقارنة قبل/بعد إن وُجد) في نافذة منبثقة.
export default function ProgressUpdatesPreview({ updates }: { updates: ClientProgressUpdate[] }) {
  useProgressUpdatesRealtime();
  const isMobile = useIsMobile();
  const [openUpdate, setOpenUpdate] = useState<ClientProgressUpdate | null>(null);
  if (updates.length === 0) return null;

  const pool = isMobile ? [] : flattenUpdatesToMediaCards(updates);

  return (
    <div style={{ marginTop: isMobile ? 16 : 18, marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 7, color: "var(--text-secondary)" }}>
          <Icon name="barChart" size={15} className="nav-icon" />
          العمل الجاري
        </h2>
        <Link href="/client/progress" className="btn btn-outline" style={{ fontSize: 11.5, padding: "5px 10px" }}>
          عرض جميع الأعمال الجارية
        </Link>
      </div>

      {isMobile ? (
        // شريط أفقي مضغوط على الجوال، بنفس فكرة شريط الكواليس تماماً — أصغر
        // من بطاقات المشاريع ويُتصفَّح بسحب يمين/يسار بدل التمرير العمودي.
        <div className="mobile-feed-scroll" style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {updates.slice(0, MAX_UPDATES_SCANNED).map((update) => (
            <MobileFeedCard key={update.id} update={update} onOpen={() => setOpenUpdate(update)} />
          ))}
        </div>
      ) : (
        <div className="bts-strip">
          <div className="bts-strip-track">
            {Array.from({ length: SLOT_COUNT }, (_, slotIndex) => (
              <SlideshowSlot key={slotIndex} slotIndex={slotIndex} pool={pool} onOpen={setOpenUpdate} />
            ))}
          </div>
        </div>
      )}

      {openUpdate && (
        <div className="modal-overlay" onClick={() => setOpenUpdate(null)}>
          <div className="modal-content" style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <ProgressUpdateCard update={openUpdate} showProjectHashtag />
          </div>
        </div>
      )}
    </div>
  );
}

// بطاقة مضغوطة لشريط الجوال الأفقي — أصغر من بطاقة المشروع عمداً، نفس فكرة
// بطاقة الكواليس المضغوطة.
function MobileFeedCard({ update, onOpen }: { update: ClientProgressUpdate; onOpen: () => void }) {
  const cover = update.media.find((m) => m.label !== "before") ?? update.media[0] ?? null;
  const stageMeta = PROGRESS_UPDATE_STAGES.find((s) => s.value === update.stage);

  return (
    <button
      onClick={onOpen}
      className="card"
      style={{ padding: 0, overflow: "hidden", textAlign: "start", display: "flex", flexDirection: "column", width: 132, flexShrink: 0, scrollSnapAlign: "start" }}
    >
      {cover && (
        <div style={{ position: "relative", width: "100%", height: 96, background: "#000" }}>
          {cover.type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.url} alt={cover.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : cover.type === "video" ? (
            <video src={cover.url} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="barChart" size={22} className="nav-icon" />
            </div>
          )}
          {cover.type === "video" && (
            <span style={{ position: "absolute", top: "50%", insetInlineStart: "50%", transform: "translate(-50%,-50%)", background: "rgba(0,0,0,0.55)", borderRadius: "50%", padding: 7, display: "flex", color: "#fff" }}>
              <Icon name="play" size={13} />
            </span>
          )}
          {update.contentType === "comparison" && (
            <span style={{ position: "absolute", top: 6, insetInlineStart: 6, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 6 }}>
              قبل/بعد
            </span>
          )}
        </div>
      )}
      <div style={{ padding: 8 }}>
        <div style={{ fontSize: 9.5, color: "var(--gold)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {projectHashtag(update.projectName)}
          {stageMeta ? ` · ${stageMeta.label}` : ""}
        </div>
        {update.title && (
          <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{update.title}</div>
        )}
        <div style={{ fontSize: 9.5, color: "var(--text-muted)", marginTop: 2 }}>{relativeTime(update.createdAt)}</div>
      </div>
    </button>
  );
}

function SlideshowSlot({ slotIndex, pool, onOpen }: { slotIndex: number; pool: StripMediaCard[]; onOpen: (update: ClientProgressUpdate) => void }) {
  // بذرة بداية مختلفة لكل خانة كي لا تعرض كل الخانات نفس الصورة في البداية.
  const randomIndex = useRandomSlideIndex(pool.length, slotIndex * 3 + 2);
  const item = pool.length > 0 ? pool[randomIndex % pool.length] : null;
  const media = item?.media ?? null;
  const stageMeta = item ? PROGRESS_UPDATE_STAGES.find((s) => s.value === item.update.stage) : null;

  return (
    <button
      className="bts-strip-card"
      onClick={() => item && onOpen(item.update)}
      style={{ width: SLOT_SIZE.width, height: SLOT_SIZE.height, animationDelay: `${slotIndex * 70}ms` }}
    >
      <MediaCrossfadeSlot item={media ? { key: item!.key, type: media.type, url: media.url, name: media.name } : null} placeholderIcon="barChart" />

      {item?.update.contentType === "comparison" && (
        <span style={{ position: "absolute", top: 8, insetInlineStart: 8, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>
          قبل/بعد
        </span>
      )}

      <span
        className="bts-strip-card-expand"
        style={{ position: "absolute", top: 8, insetInlineEnd: 8, background: "rgba(0,0,0,0.5)", borderRadius: "50%", padding: 5, display: "flex", color: "#fff" }}
      >
        <Icon name="export" size={12} />
      </span>

      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent 55%)" }} />
      <div style={{ position: "absolute", bottom: 8, insetInlineStart: 10, insetInlineEnd: 10, textAlign: "start" }}>
        <div style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {projectHashtag(item?.update.projectName ?? "")}
          {stageMeta ? ` · ${stageMeta.label}` : ""}
        </div>
        <div style={{ fontSize: 11.5, color: "#fff", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item?.update.title ?? "العمل الجاري"}</div>
      </div>
    </button>
  );
}
