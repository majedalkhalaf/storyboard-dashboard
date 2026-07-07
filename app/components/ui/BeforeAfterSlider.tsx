"use client";

import { useState } from "react";
import type { ProgressUpdateMediaItem } from "@/app/lib/types";

// مقارنة "قبل/بعد" — لصورتين تُعرض بسلايدر أفقي حقيقي (input range) يتحكم في
// كشف الصورة الثانية تدريجياً فوق الأولى عبر clip-path، بلا أي مكتبة خارجية.
// للفيديو (لا يمكن تركيب سلايدر مقارنة حي عملياً بلا معالجة إضافية) يُعرض
// الفيديوهان جنباً إلى جنب بعلامتي "قبل"/"بعد" بدل تعطيل الميزة كلياً.
export default function BeforeAfterSlider({ before, after }: { before: ProgressUpdateMediaItem; after: ProgressUpdateMediaItem }) {
  const [percent, setPercent] = useState(50);

  if (before.type === "video" || after.type === "video") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <MediaPane item={before} label="قبل" />
        <MediaPane item={after} label="بعد" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ position: "relative", width: "100%", borderRadius: 12, overflow: "hidden", background: "#000" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={after.url} alt={after.name} style={{ width: "100%", height: "auto", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", clipPath: `inset(0 ${100 - percent}% 0 0)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={before.url} alt={before.name} style={{ width: "100%", height: "auto", display: "block" }} />
        </div>
        <div style={{ position: "absolute", top: 0, bottom: 0, insetInlineStart: `${percent}%`, width: 2, background: "#fff", pointerEvents: "none" }} />
        <span style={{ position: "absolute", top: 10, insetInlineStart: 10, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6 }}>قبل</span>
        <span style={{ position: "absolute", top: 10, insetInlineEnd: 10, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6 }}>بعد</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={percent}
        onChange={(e) => setPercent(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--gold)" }}
        aria-label="مقارنة قبل وبعد"
      />
    </div>
  );
}

function MediaPane({ item, label }: { item: ProgressUpdateMediaItem; label: string }) {
  return (
    <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", background: "#000" }}>
      {item.type === "video" ? (
        <video src={item.url} controls playsInline style={{ width: "100%", display: "block" }} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt={item.name} style={{ width: "100%", display: "block" }} />
      )}
      <span style={{ position: "absolute", top: 10, insetInlineStart: 10, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 6 }}>{label}</span>
    </div>
  );
}
