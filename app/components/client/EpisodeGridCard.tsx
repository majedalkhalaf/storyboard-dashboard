"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import StatusChip from "@/app/components/client/StatusChip";
import ApproveEpisode from "@/app/components/client/ApproveEpisode";
import CoverLogoBadge from "@/app/components/client/CoverLogoBadge";
import EditRequestComposer from "@/app/components/client/EditRequestComposer";
import { createClient } from "@/app/lib/supabase/client";
import { exportEpisodeFilesZip, type ExportProgress } from "@/app/lib/client-zip-export";
import { canClient } from "@/app/lib/permissions";
import { episodeStatusMeta, relativeTime, formatDate } from "@/app/components/client/utils";
import type { ClientPermissions, Episode, ProjectFile } from "@/app/lib/types";

// بطاقة حلقة قابلة لإعادة الاستخدام — الشكل نفسه المستخدم في تبويب "الحلقات"
// داخل صفحة المشروع، وأيضاً في صفحة "الحلقات والإنتاج" المجمّعة عبر كل المشاريع.
export default function EpisodeGridCard({
  episode,
  projectId,
  companyId,
  userId,
  permissions,
  isApproved,
  fileCount,
  noteCount,
  projectName,
  companyLogoUrl,
}: {
  episode: Episode;
  projectId: string;
  companyId: string;
  userId: string;
  permissions: ClientPermissions;
  isApproved: boolean;
  fileCount: number;
  noteCount: number;
  projectName?: string;
  companyLogoUrl?: string | null;
}) {
  const es = episodeStatusMeta(episode.status);
  const overdue = episode.delivery_date && new Date(episode.delivery_date) < new Date() && !isApproved;
  const [requestOpen, setRequestOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const canDownload = canClient(permissions, "download_files");

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
    <div className="shot-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Link href={`/client/projects/${projectId}/episodes/${episode.id}`} style={{ textDecoration: "none", color: "var(--text-primary)" }}>
        <div style={{ background: "#000", maxHeight: 160, overflow: "hidden", display: "flex", justifyContent: "center", position: "relative" }}>
          {episode.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={episode.cover_image_url} alt={episode.title} loading="lazy" style={{ width: "100%", maxHeight: 160, objectFit: "contain" }} />
          ) : (
            <div style={{ width: "100%", height: 130, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="video" size={30} className="nav-icon" />
            </div>
          )}
          <div style={{ position: "absolute", top: 8, insetInlineStart: 8, display: "flex", gap: 6 }}>
            <StatusChip label={es.label} color={es.color} />
            {overdue && <StatusChip label="متأخرة" color="#EF4444" />}
          </div>
          <CoverLogoBadge logoUrl={companyLogoUrl} name={projectName ?? episode.title} position="top-end" />
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
          variant="card"
        />
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
