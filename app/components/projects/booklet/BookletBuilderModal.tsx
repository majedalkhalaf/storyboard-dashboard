"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { useSession } from "@/app/providers/SessionProvider";
import { loadBookletBundle, saveBookletPatch, type BookletBundle } from "@/app/lib/booklet-builder";
import type { BookletTexts, PresentationSectionConfig, PresentationTemplate } from "@/app/lib/types";
import TemplatePanel from "@/app/components/projects/presentation/TemplatePanel";
import BookletSectionsPanel from "./BookletSectionsPanel";
import BookletTextsPanel from "./BookletTextsPanel";
import BookletPreview from "./BookletPreview";
import BookletShareExportPanel from "./BookletShareExportPanel";

type BuilderTab = "sections" | "texts" | "template" | "preview" | "share";

const TABS: { key: BuilderTab; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { key: "sections", label: "الأقسام", icon: "list" },
  { key: "texts", label: "النصوص", icon: "edit" },
  { key: "template", label: "القالب", icon: "palette" },
  { key: "preview", label: "المعاينة", icon: "eye" },
  { key: "share", label: "المشاركة والتصدير", icon: "export" },
];

export default function BookletBuilderModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { company, userId } = useSession();
  const companyId = company!.id;

  const [bundle, setBundle] = useState<BookletBundle | null>(null);
  const [tab, setTab] = useState<BuilderTab>("sections");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBookletBundle(companyId, userId, projectId).then(setBundle);
  }, [companyId, userId, projectId]);

  async function persist(patch: Partial<{ sections: PresentationSectionConfig[]; texts: BookletTexts; template: PresentationTemplate }>) {
    if (!bundle) return;
    setBundle((prev) => (prev ? { ...prev, booklet: { ...prev.booklet, ...patch } } : prev));
    setSaving(true);
    await saveBookletPatch(bundle.booklet.id, patch);
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "min(1200px, 96vw)", height: "92vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="fileCheck" size={18} className="text-muted" />
            <h2 style={{ fontSize: 16, fontWeight: 800 }}>منشئ كتيّب المشروع النهائي</h2>
            {saving && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>جارٍ الحفظ...</span>}
          </div>
          <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {!bundle ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="skeleton" style={{ width: 240, height: 20, borderRadius: 8 }} />
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <div style={{ width: 180, flexShrink: 0, borderLeft: "1px solid var(--border)", padding: 12, display: "flex", flexDirection: "column", gap: 2 }}>
              {TABS.map((t) => (
                <button
                  key={t.key}
                  className="sidebar-link"
                  style={{
                    background: tab === t.key ? "rgba(var(--gold-rgb),0.12)" : "transparent",
                    color: tab === t.key ? "var(--gold)" : "var(--text-secondary)",
                  }}
                  onClick={() => setTab(t.key)}
                >
                  <Icon name={t.icon} size={16} />
                  <span style={{ fontSize: 13 }}>{t.label}</span>
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {tab === "sections" && (
                <BookletSectionsPanel data={bundle.data} sections={bundle.booklet.sections} onChange={(sections) => persist({ sections })} />
              )}
              {tab === "texts" && <BookletTextsPanel texts={bundle.booklet.texts} onChange={(texts) => persist({ texts })} />}
              {tab === "template" && (
                <TemplatePanel value={bundle.booklet.template} onChange={(template) => persist({ template })} data={bundle.data} />
              )}
              {tab === "preview" && <BookletPreview bundle={bundle} />}
              {tab === "share" && <BookletShareExportPanel bundle={bundle} onBundleChange={setBundle} projectId={projectId} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
