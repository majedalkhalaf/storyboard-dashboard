"use client";

import { useMemo, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { buildTocEntries } from "@/app/lib/booklet-sections";
import type { BookletData } from "@/app/lib/booklet-sections";
import type { PresentationTheme } from "@/app/lib/presentation-themes";
import type { BookletTexts } from "@/app/lib/types";
import BookletSectionRenderer from "@/app/components/projects/booklet/BookletSectionRenderer";

// نفس PresentationShareViewer.tsx تماماً (عارض تفاعلي بسيط تالي/سابق، بلا جلسة
// تسجيل دخول) لكن لمحتوى الكتيّب.
export default function BookletShareViewer({
  data,
  texts,
  theme,
  ordered,
  qrDataUrl,
}: {
  data: BookletData;
  texts: BookletTexts;
  theme: PresentationTheme;
  ordered: string[];
  qrDataUrl: string;
}) {
  const [index, setIndex] = useState(0);
  const tocEntries = useMemo(() => buildTocEntries(ordered), [ordered]);

  if (ordered.length === 0) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg, color: theme.text }}>
        <p style={{ fontSize: 14 }}>لا يوجد محتوى متاح لهذا الكتيّب حالياً.</p>
      </div>
    );
  }

  const currentKey = ordered[Math.min(index, ordered.length - 1)];
  const isFirst = index === 0;
  const isLast = index === ordered.length - 1;

  function go(delta: number) {
    setIndex((i) => Math.min(ordered.length - 1, Math.max(0, i + delta)));
  }

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <BookletSectionRenderer sectionKey={currentKey} data={data} texts={texts} theme={theme} tocEntries={tocEntries} />
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 18,
            insetInlineStart: 18,
            background: "rgba(255,255,255,0.94)",
            borderRadius: 10,
            padding: 8,
            boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="رابط المشاركة QR" style={{ width: 84, height: 84, display: "block" }} />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: theme.card,
          borderTop: `1px solid ${theme.border}`,
        }}
      >
        <button
          onClick={() => go(-1)}
          disabled={isFirst}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: "transparent",
            color: theme.text,
            opacity: isFirst ? 0.4 : 1,
            cursor: isFirst ? "default" : "pointer",
            fontFamily: "inherit",
            fontSize: 13,
          }}
        >
          <Icon name="chevronRight" size={16} /> السابق
        </button>

        <span style={{ fontSize: 12, color: theme.muted }}>
          {index + 1} / {ordered.length}
        </span>

        <button
          onClick={() => go(1)}
          disabled={isLast}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: theme.accent,
            color: "#0A0A0B",
            opacity: isLast ? 0.4 : 1,
            cursor: isLast ? "default" : "pointer",
            fontWeight: 700,
            fontFamily: "inherit",
            fontSize: 13,
          }}
        >
          التالي <Icon name="chevronLeft" size={16} />
        </button>
      </div>
    </div>
  );
}
