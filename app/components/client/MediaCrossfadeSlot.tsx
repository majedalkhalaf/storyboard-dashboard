"use client";

import { useState } from "react";
import Icon, { type IconName } from "@/app/components/ui/Icon";

export interface CrossfadeMediaItem {
  key: string;
  type: "image" | "video" | "audio";
  url: string;
  name: string;
}

// طبقتان متراكمتان تتبادلان الظهور/الاختفاء (Ping-Pong) بدل استبدال عنصر
// الوسائط مباشرة — هذا ما يسمح بتلاشي الصورة القديمة والجديدة معاً في آنٍ
// واحد (Crossfade حقيقي) بدل أن تختفي القديمة فجأة عند إزالتها من الشجرة.
// تحديث الحالة يحدث أثناء الرسم نفسه (لا داخل useEffect) قياساً بنفس نمط
// "تعديل الحالة عند تغيّر خاصية" المعتمد سابقاً في NotesThread.tsx.
function useCrossfadeLayers(item: CrossfadeMediaItem | null) {
  const [layerA, setLayerA] = useState<CrossfadeMediaItem | null>(item);
  const [layerB, setLayerB] = useState<CrossfadeMediaItem | null>(null);
  const [showA, setShowA] = useState(true);
  const [trackedKey, setTrackedKey] = useState<string | null>(item?.key ?? null);

  const incomingKey = item?.key ?? null;
  if (incomingKey !== trackedKey) {
    setTrackedKey(incomingKey);
    if (showA) setLayerB(item);
    else setLayerA(item);
    setShowA((v) => !v);
  }

  return { layerA, layerB, showA };
}

export default function MediaCrossfadeSlot({ item, placeholderIcon }: { item: CrossfadeMediaItem | null; placeholderIcon: IconName }) {
  const { layerA, layerB, showA } = useCrossfadeLayers(item);
  return (
    <>
      <CrossfadeLayer item={layerA} visible={showA} placeholderIcon={placeholderIcon} />
      <CrossfadeLayer item={layerB} visible={!showA} placeholderIcon={placeholderIcon} />
    </>
  );
}

function CrossfadeLayer({ item, visible, placeholderIcon }: { item: CrossfadeMediaItem | null; visible: boolean; placeholderIcon: IconName }) {
  return (
    <div className="bts-crossfade-layer" style={{ position: "absolute", inset: 0, opacity: visible ? 1 : 0 }}>
      {item ? (
        item.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : item.type === "video" ? (
          <video src={item.url} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-hover)" }}>
            <Icon name="mic" size={22} className="nav-icon" />
          </div>
        )
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-hover)" }}>
          <Icon name={placeholderIcon} size={22} className="nav-icon" />
        </div>
      )}
    </div>
  );
}
