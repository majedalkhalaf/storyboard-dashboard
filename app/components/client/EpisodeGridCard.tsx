"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import StatusChip from "@/app/components/client/StatusChip";
import ApproveEpisode from "@/app/components/client/ApproveEpisode";
import EditRequestComposer from "@/app/components/client/EditRequestComposer";
import { VideoPlayerModal } from "@/app/components/client/ClientVideoPlayer";
import { createClient } from "@/app/lib/supabase/client";
import { exportEpisodeFilesZip, type ExportProgress } from "@/app/lib/client-zip-export";
import { canClient } from "@/app/lib/permissions";
import { episodeStatusMeta, relativeTime, formatDate } from "@/app/components/client/utils";
import type { ClientPermissions, Episode, Note, ProjectFile } from "@/app/lib/types";

// بطاقة حلقة قابلة لإعادة الاستخدام — الشكل نفسه المستخدم في تبويب "الحلقات"
// داخل صفحة المشروع، وأيضاً في صفحة "الحلقات والإنتاج" المجمّعة عبر كل المشاريع.
export default function EpisodeGridCard({
  episode,
  projectId,
  companyId,
  userId,
  userName,
  permissions,
  isApproved,
  fileCount,
  noteCount,
  hasOpenEditRequest,
  projectName,
  unreadCount = 0,
}: {
  episode: Episode;
  projectId: string;
  companyId: string;
  userId: string;
  userName: string | null;
  permissions: ClientPermissions;
  isApproved: boolean;
  fileCount: number;
  noteCount: number;
  hasOpenEditRequest: boolean;
  projectName?: string;
  /** عدد إشعارات العميل نفسه غير المقروءة الخاصة بهذه الحلقة تحديداً (رد الفريق،
   * تحديث حالة...) — نفس فكرة علامة التنبيهات على بطاقة الحلقة في لوحة الفريق. */
  unreadCount?: number;
}) {
  const es = episodeStatusMeta(episode.status);
  const overdue = episode.delivery_date && new Date(episode.delivery_date) < new Date() && !isApproved;
  const [requestOpen, setRequestOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const canDownload = canClient(permissions, "download_episode_zip");
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [videoFile, setVideoFile] = useState<ProjectFile | null>(null);
  const [videoComments, setVideoComments] = useState<Note[]>([]);

  // تشغيل الفيديو مباشرة من البطاقة (بلا الانتقال لصفحة الحلقة الكاملة) — يجلب
  // ملف الفيديو الأول فقط عند الحاجة الفعلية (لا يُحمَّل مسبقاً لكل بطاقات
  // الشبكة دفعة واحدة)، بنفس مشغّل الفيديو المستخدم داخل صفحة الحلقة.
  async function openVideo(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loadingVideo) return;
    setLoadingVideo(true);
    try {
      const supabase = createClient();
      const { data: fileRows } = await supabase
        .from("files")
        .select("*")
        .eq("episode_id", episode.id)
        .eq("client_visible", true)
        .eq("category", "video")
        .not("storage_path", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      const file = (fileRows ?? [])[0] as ProjectFile | undefined;
      if (!file) return;
      const { data: noteRows } = await supabase.from("notes").select("*").eq("target_type", "video").eq("target_id", file.id);
      setVideoComments((noteRows ?? []) as Note[]);
      setVideoFile(file);
    } finally {
      setLoadingVideo(false);
    }
  }

  async function handleDownloadAll(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.from("files").select("*").eq("episode_id", episode.id).eq("client_visible", true);
      await exportEpisodeFilesZip(episode.title, (data ?? []) as ProjectFile[], setProgress);
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      {unreadCount > 0 && (
        <span
          title={`${unreadCount} تحديث جديد`}
          style={{
            position: "absolute",
            top: -8,
            insetInlineEnd: -8,
            zIndex: 3,
            background: "#ef4444",
            color: "#fff",
            fontSize: 11,
            fontWeight: 800,
            minWidth: 22,
            height: 22,
            borderRadius: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 5px",
            border: "2px solid var(--bg-primary)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.45)",
          }}
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
      <div className="shot-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Link href={`/client/projects/${projectId}/episodes/${episode.id}`} style={{ textDecoration: "none", color: "var(--text-primary)" }}>
        <div style={{ position: "relative", aspectRatio: "16 / 9", overflow: "hidden", background: "var(--bg-hover)" }}>
          {episode.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={episode.cover_image_url} alt={episode.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="video" size={30} className="nav-icon" />
            </div>
          )}
          <div style={{ position: "absolute", top: 8, insetInlineStart: 8, display: "flex", gap: 6 }}>
            <StatusChip label={es.label} color={es.color} />
            {overdue && <StatusChip label="متأخرة" color="#EF4444" />}
          </div>
          <button
            type="button"
            onClick={openVideo}
            aria-label="تشغيل الفيديو"
            style={{
              position: "absolute",
              inset: 0,
              margin: "auto",
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.55)",
              border: "2px solid rgba(255,255,255,0.85)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: loadingVideo ? "wait" : "pointer",
            }}
          >
            {loadingVideo ? <span className="skeleton" style={{ width: 16, height: 16, borderRadius: "50%" }} /> : <Icon name="play" size={22} />}
          </button>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>
            {episode.number != null ? `الحلقة ${episode.number}` : "حلقة"}
            {projectName ? ` · ${projectName}` : ""}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{episode.title}</h3>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>
            <span>{episode.progress ?? 0}%</span>
            <span>{relativeTime(episode.updated_at)}</span>
          </div>
          <div className="progress-bar" style={{ marginBottom: 10 }}>
            <div className="progress-fill" style={{ width: `${episode.progress ?? 0}%`, background: es.color }} />
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="files" size={12} /> {fileCount}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="message" size={12} /> {noteCount}
            </span>
            {episode.delivery_date && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="calendar" size={12} /> {formatDate(episode.delivery_date)}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div style={{ padding: "0 14px 14px", marginTop: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
        {canClient(permissions, "add_notes") && (
          <button
            className="btn btn-outline"
            style={{ fontSize: 13, padding: "8px 12px" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSent(false);
              setRequestOpen(true);
            }}
          >
            <Icon name="edit" size={15} />
            {sent ? "تم الإرسال ✓" : "طلب تعديل"}
          </button>
        )}
        {canDownload && fileCount > 0 && (
          <button className="btn btn-outline" style={{ fontSize: 13, padding: "8px 12px" }} onClick={handleDownloadAll} disabled={downloading}>
            <Icon name="archive" size={15} />
            {downloading ? `${progress?.stage ?? "جارٍ التحميل..."} ${progress?.percent ?? 0}%` : "تحميل جميع ملفات الحلقة"}
          </button>
        )}
        <ApproveEpisode
          episodeId={episode.id}
          projectId={projectId}
          companyId={companyId}
          currentUserId={userId}
          status={episode.status}
          alreadyApproved={isApproved}
          canApprove={canClient(permissions, "approve_episodes")}
          hasOpenEditRequest={hasOpenEditRequest}
          variant="card"
        />
      </div>
      {downloading && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ height: 6, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress?.percent ?? 0}%`, background: "var(--gold)", transition: "width 0.2s" }} />
          </div>
        </div>
      )}
      </div>

      {requestOpen && (
        <EditRequestComposer
          open={requestOpen}
          onClose={() => setRequestOpen(false)}
          companyId={companyId}
          projectId={projectId}
          episodeId={episode.id}
          targetType="episode"
          targetId={episode.id}
          currentUserId={userId}
          canUploadAttachments={canClient(permissions, "upload_attachments")}
          onCreated={() => setSent(true)}
        />
      )}

      {videoFile && (
        <VideoPlayerModal
          file={videoFile}
          comments={videoComments}
          companyId={companyId}
          projectId={projectId}
          episodeId={episode.id}
          userId={userId}
          userName={userName}
          canComment={canClient(permissions, "add_notes")}
          canDownload={canClient(permissions, "download_files")}
          canRequestEdit={canClient(permissions, "add_notes")}
          canUploadAttachments={canClient(permissions, "upload_attachments")}
          onClose={() => setVideoFile(null)}
        />
      )}
    </div>
  );
}
