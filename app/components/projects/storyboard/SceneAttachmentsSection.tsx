"use client";

import { useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import type { ProjectFile } from "@/app/lib/types";
import type { StoryboardSceneFullDetail } from "@/app/lib/storyboard-detail";
import { FILE_CATEGORY_ICON, humanFileSize, inferCategory, relativeTime } from "../utils";
import { FILE_CATEGORY_LABEL, FilePreviewModal, copyFileLink, downloadFile, openFile, previewKind, resolveFileUrl } from "../FilesPanel";

// المرفقات مقيّدة بهذا المشهد (files.scene_id) — نفس نمط رفع/عرض/تحميل/حذف FilesPanel.tsx
// لكن بدون تصنيفات وهمية جديدة (RAW/Moodboard/...) لأن جدول files فيه category حقيقي واحد فقط.
export default function SceneAttachmentsSection({
  scene,
  projectId,
  onChanged,
}: {
  scene: StoryboardSceneFullDetail;
  projectId: string;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const { userId, company } = useSession();
  const companyId = company!.id;

  const [uploading, setUploading] = useState(false);
  const [clientVisible, setClientVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ file: ProjectFile; url: string | null; loading: boolean } | null>(null);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        const path = `${companyId}/${projectId}/${crypto.randomUUID()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("project-files").upload(path, file, { upsert: false });
        if (upErr) continue;
        await supabase.from("files").insert({
          company_id: companyId,
          project_id: projectId,
          episode_id: scene.episode_id,
          scene_id: scene.id,
          uploaded_by: userId,
          name: file.name,
          storage_path: path,
          file_type: file.type || null,
          category: inferCategory(file.type, file.name),
          size_bytes: file.size,
          client_visible: clientVisible,
        });
      }
      onChanged();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function openPreview(f: ProjectFile) {
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

  async function remove(f: ProjectFile) {
    if (!confirm(`حذف الملف "${f.name}"؟`)) return;
    if (f.storage_path) await supabase.storage.from("project-files").remove([f.storage_path]);
    await supabase.from("files").delete().eq("id", f.id);
    onChanged();
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 15, fontWeight: 800 }}>المرفقات</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" checked={clientVisible} onChange={(e) => setClientVisible(e.target.checked)} />
            مرئي للعميل
          </label>
          <label className="btn btn-gold" style={{ cursor: uploading ? "wait" : "pointer" }}>
            <Icon name="upload" size={15} /> {uploading ? "جارٍ الرفع..." : "رفع ملف"}
            <input ref={inputRef} type="file" multiple hidden disabled={uploading} onChange={(e) => handleUpload(e.target.files)} />
          </label>
        </div>
      </div>

      {scene.files.length === 0 ? (
        <div className="empty-state">
          <Icon name="attachment" size={28} className="text-muted" />
          <p style={{ marginTop: 10 }}>لا توجد مرفقات لهذا المشهد بعد</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
          {scene.files.map((f) => (
            <div key={f.id} className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ color: "var(--gold)", flexShrink: 0 }}>
                  <Icon name={FILE_CATEGORY_ICON[f.category]} size={20} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {FILE_CATEGORY_LABEL[f.category]} {humanFileSize(f.size_bytes) ? `· ${humanFileSize(f.size_bytes)}` : ""} · {relativeTime(f.created_at)}
                  </div>
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
                <button className="btn-ghost" style={{ padding: "6px 8px", borderRadius: 8, marginRight: "auto", color: "#ef4444" }} onClick={() => remove(f)}>
                  <Icon name="trash" size={14} />
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
