"use client";

import { useMemo, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { BOOKLET_SECTIONS, buildTocEntries } from "@/app/lib/booklet-sections";
import { getPresentationTheme } from "@/app/lib/presentation-themes";
import type { BookletBundle } from "@/app/lib/booklet-builder";
import BookletSectionRenderer from "./BookletSectionRenderer";

export function useOrderedEnabledBookletSections(bundle: BookletBundle) {
  return useMemo(
    () => bundle.booklet.sections.filter((s) => s.enabled && BOOKLET_SECTIONS.some((def) => def.key === s.key)).map((s) => s.key),
    [bundle.booklet.sections]
  );
}

export default function BookletPreview({ bundle }: { bundle: BookletBundle }) {
  const ordered = useOrderedEnabledBookletSections(bundle);
  const [index, setIndex] = useState(0);
  const theme = getPresentationTheme(bundle.booklet.template, bundle.data);
  const currentKey = ordered[Math.min(index, ordered.length - 1)];
  const tocEntries = useMemo(() => buildTocEntries(ordered), [ordered]);

  if (ordered.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="fileCheck" size={28} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا توجد أقسام مفعّلة للمعاينة — فعّل قسماً واحداً على الأقل من تبويب الأقسام.</p>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--border)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.4)",
        }}
      >
        <BookletSectionRenderer sectionKey={currentKey} data={bundle.data} texts={bundle.booklet.texts} theme={theme} tocEntries={tocEntries} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
        <button className="btn btn-outline" style={{ padding: "8px 14px" }} disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
          <Icon name="chevronRight" size={16} /> السابق
        </button>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {index + 1} / {ordered.length}
        </span>
        <button
          className="btn btn-outline"
          style={{ padding: "8px 14px" }}
          disabled={index === ordered.length - 1}
          onClick={() => setIndex((i) => Math.min(ordered.length - 1, i + 1))}
        >
          التالي <Icon name="chevronLeft" size={16} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 12, overflowX: "auto", paddingBottom: 4 }}>
        {ordered.map((key, i) => {
          const def = BOOKLET_SECTIONS.find((d) => d.key === key);
          return (
            <button
              key={key}
              onClick={() => setIndex(i)}
              className="chip"
              style={{
                flexShrink: 0,
                cursor: "pointer",
                color: i === index ? "var(--gold)" : "var(--text-muted)",
                borderColor: i === index ? "var(--gold)" : "var(--border)",
              }}
            >
              {i + 1}. {def?.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
