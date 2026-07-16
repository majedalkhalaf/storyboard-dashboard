"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import FileList from "@/app/components/client/FileList";
import DownloadProgressBar from "@/app/components/client/DownloadProgressBar";
import { createClient } from "@/app/lib/supabase/client";
import { exportEpisodeFilesZip, type ExportProgress } from "@/app/lib/client-zip-export";
import { runTrackedDownload } from "@/app/lib/download-queue-store";
import { canClient } from "@/app/lib/permissions";
import type { ClientPermissions, ProjectFile } from "@/app/lib/types";

// يجلب ملفات الحلقة من المتصفح بعد الرسم الأول (Lazy) بدل تحميلها كاملة من
// الخادم قبل عرض الصفحة. تُصنَّف الملفات إلى مجموعات مفهومة للعميل بدل قائمة
// تقنية واحدة — الفيديو يُسمّى "النسخة الحالية" أو "النسخة النهائية" اعتماداً
// على حالة اعتماد الحلقة الفعلية (لا تُخترع علامة "نهائي" منفصلة لكل ملف).
export default function EpisodeFilesSection({
  episodeTitle,
  episodeId,
  isApproved,
  permissions,
}: {
  episodeTitle: string;
  episodeId: string;
  isApproved: boolean;
  permissions: ClientPermissions;
}) {
  const [files, setFiles] = useState<ProjectFile[] | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadingFinal, setDownloadingFinal] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const canDownloadZip = canClient(permissions, "download_episode_zip");

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("files")
      .select(
        "id, company_id, project_id, episode_id, scene_id, uploaded_by, name, storage_path, external_url, file_type, category, size_bytes, client_visible, created_at, original_name, mime_type, file_extension, bucket_name, uploaded_by_role, client_can_view, client_can_download, is_public, version, status, thumbnail_url, preview_url, duration_seconds, width, height, metadata, updated_at"
      )
      .eq("episode_id", episodeId)
      .eq("client_visible", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setFiles((data ?? []) as ProjectFile[]);
      });
    return () => {
      cancelled = true;
    };
  }, [episodeId]);

  const groups = useMemo(() => {
    const all = files ?? [];
    const videos = all.filter((f) => f.category === "video");
    const documents = all.filter((f) => f.category === "document");
    const images = all.filter((f) => f.category === "image");
    const other = all.filter((f) => !["video", "document", "image"].includes(f.category));
    return { videos, documents, images, other };
  }, [files]);

  async function downloadAll() {
    if (!files || downloadingAll) return;
    setDownloadingAll(true);
    try {
      await runTrackedDownload(episodeTitle, async ({ signal, onProgress }) => {
        await exportEpisodeFilesZip(episodeTitle, files, (p) => { setProgress(p); onProgress(p.stage, p.percent); }, signal);
      });
    } finally {
      setDownloadingAll(false);
      setProgress(null);
    }
  }

  async function downloadFinalVersion() {
    if (groups.videos.length === 0 || downloadingFinal) return;
    setDownloadingFinal(true);
    try {
      await runTrackedDownload(`${episodeTitle} — النسخة النهائية`, async ({ signal, onProgress }) => {
        await exportEpisodeFilesZip(`${episodeTitle}-final`, groups.videos, (p) => { setProgress(p); onProgress(p.stage, p.percent); }, signal);
      });
    } finally {
      setDownloadingFinal(false);
      setProgress(null);
    }
  }

  return (
    <div id="episode-files-section" className="card" style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="attachment" size={16} className="nav-icon" /> الملفات المتاحة لك
        </h2>
        {files && files.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canDownloadZip && (
              <button className="btn btn-outline" style={{ fontSize: 12.5, padding: "7px 12px" }} onClick={downloadAll} disabled={downloadingAll}>
                <Icon name="archive" size={14} /> {downloadingAll ? "جارٍ التنزيل..." : "تحميل ملفات الحلقة ZIP"}
              </button>
            )}
            {canDownloadZip && isApproved && groups.videos.length > 0 && (
              <button className="btn btn-gold" style={{ fontSize: 12.5, padding: "7px 12px" }} onClick={downloadFinalVersion} disabled={downloadingFinal}>
                <Icon name="export" size={14} /> {downloadingFinal ? "جارٍ التنزيل..." : "تحميل النسخة النهائية"}
              </button>
            )}
          </div>
        )}
      </div>

      {(downloadingAll || downloadingFinal) && progress && (
        <div style={{ marginBottom: 14 }}>
          <DownloadProgressBar stage={progress.stage} percent={progress.percent} />
        </div>
      )}

      {!files ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="skeleton" style={{ height: 56, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 56, borderRadius: 10 }} />
        </div>
      ) : files.length === 0 ? (
        <div className="empty-state" style={{ padding: 30 }}>
          <Icon name="attachment" size={30} className="nav-icon" />
          <p style={{ marginTop: 8, fontSize: 14 }}>لا توجد ملفات لهذه الحلقة بعد.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {groups.videos.length > 0 && (
            <FileGroup title={isApproved ? "النسخة النهائية" : "النسخة الحالية"} files={groups.videos} permissions={permissions} zipTitle={episodeTitle} />
          )}
          {groups.images.length > 0 && <FileGroup title="الصور" files={groups.images} permissions={permissions} zipTitle={episodeTitle} />}
          {groups.documents.length > 0 && <FileGroup title="المستندات" files={groups.documents} permissions={permissions} zipTitle={episodeTitle} />}
          {groups.other.length > 0 && <FileGroup title="ملفات إضافية" files={groups.other} permissions={permissions} zipTitle={episodeTitle} />}
        </div>
      )}
    </div>
  );
}

function FileGroup({ title, files, permissions, zipTitle }: { title: string; files: ProjectFile[]; permissions: ClientPermissions; zipTitle: string }) {
  return (
    <div>
      <h3 style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>{title}</h3>
      <FileList files={files} permissions={permissions} zipTitle={`${zipTitle} — ${title}`} />
    </div>
  );
}
