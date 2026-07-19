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
import { runTrackedDownload } from "@/app/lib/download-queue-store";
import { canClient } from "@/app/lib/permissions";
import { episodeStatusMeta, relativeTime, formatDate } from "@/app/components/client/utils";
import { getEpisodeKindLabel, isSpecialEpisodeKind, type ItemNoun } from "@/app/lib/item-noun";
import DownloadProgressBar from "@/app/components/client/DownloadProgressBar";
import { resolveTemplate } from "@/app/lib/project-templates";
import { getMetaValue } from "@/app/lib/episode-meta";
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
  fileTypeCounts = {},
  noteCount,
  projectName,
  itemNoun,
  projectType = null,
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
  /** عدد الملفات لكل امتداد — لبطاقة "التسليمة" (قالب هوية بصرية) فقط. */
  fileTypeCounts?: Record<string, number>;
  noteCount: number;
  projectName?: string;
  itemNoun: ItemNoun;
  /** نوع المشروع — يُحدَّد به قالب البطاقة عبر resolveTemplate(). */
  projectType?: string | null;
  /** عدد إشعارات العميل نفسه غير المقروءة الخاصة بهذه الحلقة تحديداً (رد الفريق،
   * تحديث حالة...) — نفس فكرة علامة التنبيهات على بطاقة الحلقة في لوحة الفريق. */
  unreadCount?: number;
}) {
  const template = resolveTemplate(projectType);
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
      const episodeFiles = (data ?? []) as ProjectFile[];
      // يُسجَّل التصدير في المخزن العام (download-queue-store) فيظهر في اللوحة
      // العائمة الثابتة عبر كل الصفحات، ويستمر (وقابل للإلغاء الحقيقي) حتى لو
      // انتقل العميل بعيداً عن هذه البطاقة أثناء التنزيل.
      await runTrackedDownload(episode.title, async ({ signal, onProgress }) => {
        await exportEpisodeFilesZip(
          episode.title,
          episodeFiles,
          (p) => {
            setProgress(p);
            onProgress(p.stage, p.percent);
          },
          signal
        );
      });
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  }

  const special = isSpecialEpisodeKind(episode.kind);
  const kindDisplayLabel = getEpisodeKindLabel(episode, itemNoun.singular);

  if (special) {
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
        <div
          className="shot-card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: 10,
            borderColor: "rgba(var(--gold-rgb),0.35)",
            background: "rgba(var(--gold-rgb),0.05)",
          }}
        >
          <Link
            href={`/client/projects/${projectId}/episodes/${episode.id}`}
            style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textDecoration: "none", color: "var(--text-primary)" }}
          >
            <div
              style={{
                width: 76,
                height: 56,
                borderRadius: 8,
                flexShrink: 0,
                overflow: "hidden",
                background: episode.cover_image_url
                  ? `center/cover no-repeat url(${episode.cover_image_url})`
                  : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {!episode.cover_image_url && <Icon name="sparkles" size={18} className="nav-icon" />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span
                className="chip"
                style={{ fontSize: 10.5, color: "var(--gold)", borderColor: "var(--gold)", background: "rgba(var(--gold-rgb),0.12)", fontWeight: 700 }}
              >
                <Icon name="sparkles" size={11} /> {kindDisplayLabel}
              </span>
              <h3 style={{ fontSize: 13.5, fontWeight: 800, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{episode.title}</h3>
              <div className="progress-bar" style={{ height: 4, marginTop: 6, maxWidth: 200 }}>
                <div className="progress-fill" style={{ width: `${episode.progress ?? 0}%`, background: es.color }} />
              </div>
            </div>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
            {canClient(permissions, "add_notes") && (
              <button
                className="btn-ghost"
                title="طلب تعديل"
                style={{ padding: "6px 8px" }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSent(false);
                  setRequestOpen(true);
                }}
              >
                <Icon name="edit" size={14} />
              </button>
            )}
            {canDownload && fileCount > 0 && (
              <button className="btn-ghost" title="تحميل الملفات" style={{ padding: "6px 8px" }} onClick={handleDownloadAll} disabled={downloading}>
                <Icon name="archive" size={14} />
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
              variant="card"
            />
          </div>
        </div>
        {downloading && (
          <div style={{ marginTop: 8 }}>
            <DownloadProgressBar stage={progress?.stage ?? "جارٍ التنزيل..."} percent={progress?.percent ?? 0} />
          </div>
        )}

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
      </div>
    );
  }

  // بطاقة "التسليمة" — قالب هوية بصرية وما شابهه: بلا زر تشغيل فيديو، غلاف مربّع،
  // شارة نوع التسليمة، وشبكة رقائق أنواع ملفات حقيقية بدل عدّاد ملفات/ملاحظات فقط.
  if (template.cardVariant === "deliverable") {
    const deliverableTypeValue = getMetaValue(episode.meta, "deliverable_type");
    const deliverableTypeLabel = template.metaFields.find((f) => f.key === "deliverable_type")?.options?.find((o) => o.value === deliverableTypeValue)?.label;
    const fileTypeChips = template.fileTypeChips ?? [];

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
            <div style={{ position: "relative", aspectRatio: "1 / 1", overflow: "hidden", background: "var(--bg-hover)" }}>
              {episode.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={episode.cover_image_url} alt={episode.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="layers" size={30} className="nav-icon" />
                </div>
              )}
              <div style={{ position: "absolute", top: 8, insetInlineStart: 8, display: "flex", gap: 6 }}>
                <StatusChip label={es.label} color={es.color} />
                {overdue && <StatusChip label="متأخرة" color="#EF4444" />}
              </div>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>
                {episode.number != null ? `${itemNoun.singular} ${episode.number}` : itemNoun.singular}
                {projectName ? ` · ${projectName}` : ""}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{episode.title}</h3>
              {deliverableTypeLabel && (
                <span
                  className="chip"
                  style={{ fontSize: 10.5, color: "var(--gold)", borderColor: "var(--gold)", background: "rgba(var(--gold-rgb),0.1)", marginBottom: 8, display: "inline-flex" }}
                >
                  {deliverableTypeLabel}
                </span>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", margin: "8px 0 5px" }}>
                <span>{episode.progress ?? 0}%</span>
                <span>{relativeTime(episode.updated_at)}</span>
              </div>
              <div className="progress-bar" style={{ marginBottom: 10 }}>
                <div className="progress-fill" style={{ width: `${episode.progress ?? 0}%`, background: es.color }} />
              </div>
              {fileTypeChips.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {fileTypeChips.map((c) => (
                    <span
                      key={c.ext}
                      className="chip"
                      style={{
                        fontSize: 10.5,
                        color: (fileTypeCounts[c.ext] ?? 0) > 0 ? "var(--text-primary)" : "var(--text-muted)",
                        opacity: (fileTypeCounts[c.ext] ?? 0) > 0 ? 1 : 0.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title={`${c.label}: ${fileTypeCounts[c.ext] ?? 0}`}
                    >
                      <Icon name={c.icon} size={11} /> {c.label} ({fileTypeCounts[c.ext] ?? 0})
                    </span>
                  ))}
                </div>
              )}
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
                {downloading ? "جارٍ التنزيل..." : "تحميل جميع الملفات"}
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
              variant="card"
            />
          </div>
          {downloading && (
            <div style={{ padding: "0 14px 14px" }}>
              <DownloadProgressBar stage={progress?.stage ?? "جارٍ التنزيل..."} percent={progress?.percent ?? 0} />
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
      </div>
    );
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
            {episode.number != null ? `${itemNoun.singular} ${episode.number}` : itemNoun.singular}
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
            {downloading ? "جارٍ التنزيل..." : "تحميل جميع ملفات الحلقة"}
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
          variant="card"
        />
      </div>
      {downloading && (
        <div style={{ padding: "0 14px 14px" }}>
          <DownloadProgressBar stage={progress?.stage ?? "جارٍ التنزيل..."} percent={progress?.percent ?? 0} />
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
