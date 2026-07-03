"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import type { FileCategory, ProjectFile } from "@/app/lib/types";
import type { EpisodeFullDetail } from "@/app/lib/episode-detail";
import { FILE_CATEGORY_ICON, humanFileSize, relativeTime } from "../utils";
import { copyFileLink, downloadFile, FilePreviewModal, openFile, previewKind, resolveFileUrl } from "../FilesPanel";

// الأصول = نفس ملفات الحلقة (جدول files) مُجمّعة حسب تصنيفها الفعلي في قاعدة البيانات (FileCategory)،
// وليست 8 فئات وهمية (شعارات/خطوط/موسيقى...) لا يوجد لها عمود حقيقي — عرض مُصنَّف صادق بدل قائمة مسطّحة.
const SECTION_ORDER: FileCategory[] = ["image", "video", "audio", "document", "archive", "design", "project_file", "link", "other"];

const SECTION_LABEL: Record<FileCategory, string> = {
  image: "الصور",
  video: "الفيديوهات",
  document: "المستندات",
  audio: "الصوتيات",
  archive: "الأرشيف/الخام",
  design: "ملفات التصميم",
  project_file: "ملفات المشروع (مونتاج/موشن)",
  link: "الروابط",
  other: "أخرى",
};

export default function AssetsTab({ episode }: { episode: EpisodeFullDetail; onChanged: () => void }) {
  const supabase = createClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ file: ProjectFile; url: string | null; loading: boolean } | null>(null);

  async function handlePreview(f: ProjectFile) {
    const kind = previewKind(f);
    if (!kind) {
      await openFile(supabase, f);
      return;
    }
    setPreview({ file: f, url: null, loading: true });
    const url = await resolveFileUrl(supabase, f);
    setPreview({ file: f, url, loading: false });
  }

  async function handleCopyLink(f: ProjectFile) {
    const ok = await copyFileLink(supabase, f);
    if (ok) {
      setCopiedId(f.id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  }

  if (episode.files.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="palette" size={30} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا توجد أصول/ملفات لهذه الحلقة بعد.</p>
      </div>
    );
  }

  const groups = SECTION_ORDER.map((cat) => ({ cat, files: episode.files.filter((f) => f.category === cat) })).filter((g) => g.files.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
        عرض مُصنَّف لملفات الحلقة حسب نوعها — نفس ملفات تبويب &quot;الملفات&quot; لكن مُجمّعة في أقسام بدل قائمة واحدة.
      </p>

      {groups.map(({ cat, files }) => (
        <div key={cat} className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--gold)" }}>
                <Icon name={FILE_CATEGORY_ICON[cat]} size={17} />
              </span>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>{SECTION_LABEL[cat]}</h3>
            </div>
            <span className="chip">{files.length}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {files.map((f) => (
              <div key={f.id} className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {humanFileSize(f.size_bytes)} {f.size_bytes ? "·" : ""} {relativeTime(f.created_at)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button className="btn btn-outline" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => handlePreview(f)}>
                    <Icon name="eye" size={13} /> معاينة
                  </button>
                  <button className="btn-ghost" title="تحميل" style={{ padding: "6px 8px", borderRadius: 8 }} onClick={() => downloadFile(supabase, f)}>
                    <Icon name="export" size={14} />
                  </button>
                  <button
                    className="btn-ghost"
                    title={copiedId === f.id ? "تم نسخ الرابط" : "نسخ الرابط"}
                    style={{ padding: "6px 8px", borderRadius: 8, color: copiedId === f.id ? "var(--gold)" : undefined }}
                    onClick={() => handleCopyLink(f)}
                  >
                    <Icon name={copiedId === f.id ? "check" : "copy"} size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {preview && <FilePreviewModal file={preview.file} url={preview.url} loading={preview.loading} onClose={() => setPreview(null)} />}
    </div>
  );
}
