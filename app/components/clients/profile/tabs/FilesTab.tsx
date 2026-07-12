"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { openUrl } from "@/app/lib/download";
import { fetchClientFiles, type FileWithProject } from "@/app/lib/client-profile";
import type { FileCategory, ProjectFile } from "@/app/lib/types";
import { FILE_CATEGORY_ICON, humanFileSize, relativeTime } from "@/app/components/projects/utils";
import {
  FILE_CATEGORY_LABEL,
  FilePreviewModal,
  copyFileLink,
  downloadFile,
  previewKind,
  resolveFileUrl,
} from "@/app/components/projects/FilesPanel";

export default function FilesTab({ clientId }: { clientId: string }) {
  const supabase = createClient();
  const [files, setFiles] = useState<FileWithProject[] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<FileCategory | "">("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ file: ProjectFile; url: string | null; loading: boolean } | null>(null);

  useEffect(() => {
    fetchClientFiles(clientId).then(setFiles);
  }, [clientId]);

  const availableCategories = useMemo(() => Array.from(new Set((files ?? []).map((f) => f.category))), [files]);

  const visibleFiles = useMemo(() => {
    if (!files) return [];
    return categoryFilter ? files.filter((f) => f.category === categoryFilter) : files;
  }, [files, categoryFilter]);

  async function openPreview(f: FileWithProject) {
    const kind = previewKind(f);
    if (!kind) {
      const url = await resolveFileUrl(supabase, f);
      if (url) openUrl(url);
      return;
    }
    setPreview({ file: f, url: null, loading: true });
    const url = await resolveFileUrl(supabase, f);
    setPreview({ file: f, url, loading: false });
  }

  async function handleCopyLink(f: FileWithProject) {
    const ok = await copyFileLink(supabase, f);
    if (ok) {
      setCopiedId(f.id);
      setTimeout(() => setCopiedId(null), 1800);
    }
  }

  if (files === null) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 100, borderRadius: 10 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {availableCategories.length > 1 && (
        <select
          className="input-field"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as FileCategory | "")}
          style={{ width: "auto", fontSize: 12, padding: "6px 10px" }}
        >
          <option value="">كل الأنواع</option>
          {availableCategories.map((c) => (
            <option key={c} value={c}>
              {FILE_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      )}

      {visibleFiles.length === 0 ? (
        <div className="empty-state card">
          <Icon name="files" size={30} className="text-muted" />
          <p style={{ marginTop: 10 }}>{files.length === 0 ? "لا توجد ملفات لهذا العميل بعد" : "لا توجد ملفات مطابقة للفلتر"}</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {visibleFiles.map((f) => (
            <div key={f.id} className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ color: "var(--gold)", flexShrink: 0 }}>
                  <Icon name={FILE_CATEGORY_ICON[f.category]} size={20} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {humanFileSize(f.size_bytes)} {f.size_bytes ? "·" : ""} {relativeTime(f.created_at)}
                  </div>
                  <span className="chip chip-gold" style={{ fontSize: 10, marginTop: 6 }}>
                    {f.project_name}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                <button className="btn btn-outline" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => openPreview(f)}>
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
      )}

      {preview && <FilePreviewModal file={preview.file} url={preview.url} loading={preview.loading} onClose={() => setPreview(null)} />}
    </div>
  );
}
