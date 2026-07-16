"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import EditRequestComposer from "@/app/components/client/EditRequestComposer";
import DownloadProgressBar from "@/app/components/client/DownloadProgressBar";
import MediaWatermark from "@/app/components/client/MediaWatermark";
import { createClient } from "@/app/lib/supabase/client";
import { downloadWithProgress } from "@/app/lib/download";
import { runTrackedDownload } from "@/app/lib/download-queue-store";
import { formatDuration } from "@/app/components/client/utils";
import { trackVideoWatch } from "@/app/lib/client-activity-tracker";

export interface HeroVideoFile {
  id: string;
  name: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  client_can_download: boolean;
  external_url: string | null;
}

// المشغّل الأهم والأكبر في صفحة الحلقة — مضمّن مباشرة في الصفحة (وليس داخل
// نافذة منبثقة) لأنه أول ما يجب أن يراه العميل. يعرض صورة الغلاف كـ Poster ولا
// يجلب رابط الفيديو الفعلي إطلاقاً إلا بعد ضغطة تشغيل حقيقية من العميل — لا
// تحميل مسبق مهما كان حجم الفيديو.
export default function EpisodeHeroPlayer({
  coverImageUrl,
  file,
  companyId,
  projectId,
  episodeId,
  userId,
  canComment,
  canDownload,
  canUploadAttachments,
}: {
  coverImageUrl: string | null;
  file: HeroVideoFile | null;
  companyId: string;
  projectId: string;
  episodeId: string;
  userId: string;
  canComment: boolean;
  canDownload: boolean;
  canUploadAttachments: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [loadingSrc, setLoadingSrc] = useState(false);
  const [srcError, setSrcError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [editRequestOpen, setEditRequestOpen] = useState(false);
  const [watermarkLogoUrl, setWatermarkLogoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxWatchedRef = useRef(0);
  const watchReportedRef = useRef(false);

  function reportWatch() {
    if (!file || watchReportedRef.current || maxWatchedRef.current < 3) return;
    watchReportedRef.current = true;
    trackVideoWatch(file.id, maxWatchedRef.current, videoRef.current?.duration || file.duration_seconds || maxWatchedRef.current, { projectId, episodeId });
  }

  useEffect(() => {
    return () => reportWatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- يُقرأ عبر refs فقط عند مغادرة الصفحة
  }, []);

  useEffect(() => {
    if (!watermarkLogoUrl && companyId) {
      let cancelled = false;
      const supabase = createClient();
      supabase
        .from("companies")
        .select("client_portal_watermark_enabled, client_portal_logo_url")
        .eq("id", companyId)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled && data?.client_portal_watermark_enabled && data.client_portal_logo_url) setWatermarkLogoUrl(data.client_portal_logo_url);
        });
      return () => {
        cancelled = true;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- تُجلب مرة واحدة فقط لكل شركة
  }, [companyId]);

  async function startPlayback() {
    if (!file || playing) return;
    setPlaying(true);
    if (file.external_url) {
      setSrc(file.external_url);
      return;
    }
    setLoadingSrc(true);
    setSrcError(false);
    try {
      const res = await fetch(`/api/client-portal/files/${file.id}`);
      const json = (await res.json()) as { url?: string };
      setSrc(json.url ?? null);
      if (!json.url) setSrcError(true);
    } catch {
      setSrcError(true);
    } finally {
      setLoadingSrc(false);
    }
  }

  async function handleDownload() {
    if (!file || downloading) return;
    setDownloading(true);
    setDownloadProgress(0);
    try {
      await runTrackedDownload(file.name, async ({ signal, onProgress }) => {
        await downloadWithProgress(
          `/api/client-portal/files/${file.id}?download=1`,
          undefined,
          file.name,
          (loaded, total) => {
            const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
            setDownloadProgress(percent);
            onProgress("جارٍ التنزيل...", percent);
          },
          signal
        );
      });
    } finally {
      setDownloading(false);
    }
  }

  if (!file) {
    return (
      <div className="card empty-state" style={{ padding: 34 }}>
        <Icon name="video" size={30} className="text-muted" />
        <p style={{ marginTop: 8, fontSize: 13.5 }}>لا يوجد فيديو لهذه الحلقة بعد.</p>
      </div>
    );
  }

  const showDownloadButton = canDownload && file.client_can_download && !file.external_url;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
        <Icon name="video" size={17} className="nav-icon" />
        <h2 style={{ fontSize: 14.5, fontWeight: 800, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</h2>
        {canComment && (
          <button className="btn btn-outline" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => setEditRequestOpen(true)}>
            <Icon name="edit" size={14} /> إضافة ملاحظة
          </button>
        )}
        {showDownloadButton && (
          <button className="btn btn-outline" style={{ fontSize: 12, padding: "6px 10px" }} onClick={handleDownload} disabled={downloading}>
            <Icon name="export" size={14} /> {downloading ? "جارٍ التنزيل..." : "تحميل"}
          </button>
        )}
      </div>

      {downloading && (
        <div style={{ padding: "0 14px", marginTop: 10 }}>
          <DownloadProgressBar stage="جارٍ التنزيل..." percent={downloadProgress} />
        </div>
      )}

      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000" }}>
        {!playing ? (
          <button
            type="button"
            onClick={startPlayback}
            aria-label="تشغيل الفيديو"
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              border: "none",
              cursor: "pointer",
              padding: 0,
              backgroundImage: coverImageUrl || file.thumbnail_url ? `url(${coverImageUrl || file.thumbnail_url})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: "#000",
            }}
          >
            <span
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.28)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.55)",
                  border: "2px solid rgba(255,255,255,0.85)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <Icon name="play" size={28} />
              </span>
            </span>
            {file.duration_seconds != null && (
              <span
                style={{
                  position: "absolute",
                  bottom: 10,
                  insetInlineEnd: 10,
                  background: "rgba(0,0,0,0.7)",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 6,
                }}
              >
                {formatDuration(file.duration_seconds)}
              </span>
            )}
          </button>
        ) : loadingSrc ? (
          <div className="skeleton" style={{ width: "100%", height: "100%" }} />
        ) : src && !srcError ? (
          <>
            <video
              ref={videoRef}
              src={src}
              controls
              autoPlay
              playsInline
              controlsList={canDownload ? undefined : "nodownload"}
              onContextMenu={(e) => e.preventDefault()}
              onTimeUpdate={(e) => {
                const t = e.currentTarget.currentTime;
                setCurrentTime(t);
                if (t > maxWatchedRef.current) maxWatchedRef.current = t;
              }}
              onError={() => setSrcError(true)}
              style={{ width: "100%", height: "100%", background: "#000", display: "block" }}
            />
            {watermarkLogoUrl && <MediaWatermark logoUrl={watermarkLogoUrl} />}
          </>
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
            تعذّر تحميل الفيديو
          </div>
        )}
      </div>

      {editRequestOpen && (
        <EditRequestComposer
          open={editRequestOpen}
          onClose={() => setEditRequestOpen(false)}
          companyId={companyId}
          projectId={projectId}
          episodeId={episodeId}
          targetType="video"
          targetId={file.id}
          currentUserId={userId}
          canUploadAttachments={canUploadAttachments}
          initialTimestampSeconds={Math.floor(currentTime)}
          onCreated={() => setEditRequestOpen(false)}
        />
      )}
    </div>
  );
}
