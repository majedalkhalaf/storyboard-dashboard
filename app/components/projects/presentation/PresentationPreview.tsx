"use client";

import { useMemo, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { PRESENTATION_SECTIONS } from "@/app/lib/presentation-sections";
import { PRESENTATION_THEMES } from "@/app/lib/presentation-themes";
import type { PresentationBundle } from "@/app/lib/presentation-builder";
import SectionRenderer from "./SectionRenderer";

export function useOrderedEnabledSections(bundle: PresentationBundle) {
  return useMemo(
    () =>
      bundle.presentation.sections
        .filter((s) => s.enabled && PRESENTATION_SECTIONS.some((def) => def.key === s.key))
        .map((s) => s.key),
    [bundle.presentation.sections]
  );
}

export default function PresentationPreview({ bundle }: { bundle: PresentationBundle }) {
  const ordered = useOrderedEnabledSections(bundle);
  const [index, setIndex] = useState(0);
  const theme = PRESENTATION_THEMES[bundle.presentation.template];
  const currentKey = ordered[Math.min(index, ordered.length - 1)];

  if (ordered.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="proposals" size={28} className="text-muted" />
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
        <SectionRenderer sectionKey={currentKey} data={bundle.data} texts={bundle.presentation.texts} theme={theme} />
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
          const def = PRESENTATION_SECTIONS.find((d) => d.key === key);
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
