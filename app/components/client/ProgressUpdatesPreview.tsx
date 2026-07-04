"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import ProgressUpdateCard, { type ClientProgressUpdate } from "@/app/components/client/ProgressUpdateCard";
import { PROGRESS_UPDATE_STAGES } from "@/app/lib/constants";
import { projectHashtag } from "@/app/components/client/utils";
import { createClient } from "@/app/lib/supabase/client";
import type { ProgressUpdateMediaItem } from "@/app/lib/types";

// أحجام متفاوتة، أصغر بوضوح من بطاقة المشروع — نفس منطق شريط الكواليس.
const CARD_SIZES = [
  { width: 150, height: 118 },
  { width: 195, height: 145 },
  { width: 170, height: 130 },
];
const MAX_UPDATES_SCANNED = 6;
const MAX_MEDIA_CARDS = 10;
const MIN_VISIBLE_TARGET = 5;

interface StripMediaCard {
  key: string;
  update: ClientProgressUpdate;
  media: ProgressUpdateMediaItem | null;
}

// نفس منطق تفكيك منشورات الكواليس: بطاقة واحدة لكل صورة/فيديو (باستثناء
// صور "قبل" كي لا تظهر مكرَّرة بمعزل عن مقارنتها) بدل بطاقة غلاف واحدة لكل
// تحديث — كي يظهر تحديث بعدة صور كمجموعة بطاقات بجانب بعضها.
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

// شريط "العمل الجاري" — بنفس أسلوب شريط الكواليس (بطاقات مصغّرة متفاوتة
// الحجم، حركة تلقائية بسيطة)، يعرض آخر التحديثات المشتركة عبر كل المشاريع.
// الضغط على أي بطاقة يفتح التحديث كاملاً بجودته الأصلية (بما فيها سلايدر
// المقارنة قبل/بعد إن وُجد) في نافذة منبثقة.
export default function ProgressUpdatesPreview({ updates }: { updates: ClientProgressUpdate[] }) {
  useProgressUpdatesRealtime();
  const [openUpdate, setOpenUpdate] = useState<ClientProgressUpdate | null>(null);
  if (updates.length === 0) return null;

  // نفس منطق شريط الكواليس: بطاقة لكل صورة/فيديو، وتكرار الدورة عدداً كافياً
  // من المرّات إن كان إجمالي البطاقات الحقيقية أقل من 5 كي لا تظهر أي مساحة
  // فارغة بجانب بطاقة أو بطاقتين فقط.
  const base = flattenUpdatesToMediaCards(updates);
  const repeatCount = base.length === 0 ? 0 : base.length < MIN_VISIBLE_TARGET ? Math.max(2, Math.ceil(MIN_VISIBLE_TARGET / base.length)) : base.length > 1 ? 2 : 1;
  const loop = repeatCount > 1;
  const items = loop ? Array.from({ length: repeatCount }, () => base).flat() : base;
  const trackStyle = loop ? ({ "--bts-shift": `-${100 / repeatCount}%` } as React.CSSProperties) : undefined;

  return (
    <div style={{ marginTop: 18, marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 7, color: "var(--text-secondary)" }}>
          <Icon name="barChart" size={15} className="nav-icon" />
          العمل الجاري
        </h2>
        <Link href="/client/progress" className="btn btn-outline" style={{ fontSize: 11.5, padding: "5px 10px" }}>
          عرض جميع الأعمال الجارية
        </Link>
      </div>

      <div className={`bts-strip${loop ? " bts-strip-auto" : ""}`}>
        <div className="bts-strip-track" style={trackStyle}>
          {items.map((item, i) => (
            <StripCard key={`${item.key}-${i}`} media={item.media} update={item.update} index={i} onOpen={() => setOpenUpdate(item.update)} />
          ))}
        </div>
      </div>

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

function StripCard({
  media,
  update,
  index,
  onOpen,
}: {
  media: ProgressUpdateMediaItem | null;
  update: ClientProgressUpdate;
  index: number;
  onOpen: () => void;
}) {
  const size = CARD_SIZES[index % CARD_SIZES.length];
  const stageMeta = PROGRESS_UPDATE_STAGES.find((s) => s.value === update.stage);

  return (
    <button className="bts-strip-card" onClick={onOpen} style={{ width: size.width, height: size.height, animationDelay: `${(index % CARD_SIZES.length) * 70}ms` }}>
      {media ? (
        media.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.url} alt={media.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : media.type === "video" ? (
          <video src={media.url} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-hover)" }}>
            <Icon name="mic" size={20} className="nav-icon" />
          </div>
        )
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-hover)" }}>
          <Icon name="barChart" size={20} className="nav-icon" />
        </div>
      )}

      {update.contentType === "comparison" && (
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
          {projectHashtag(update.projectName)}
          {stageMeta ? ` · ${stageMeta.label}` : ""}
        </div>
        {update.title && (
          <div style={{ fontSize: 11.5, color: "#fff", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{update.title}</div>
        )}
      </div>
    </button>
  );
}
