"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import ModalPortal from "@/app/components/ui/ModalPortal";
import { createClient } from "@/app/lib/supabase/client";
import EditRequestComposer from "@/app/components/client/EditRequestComposer";
import { formatDuration, relativeTime } from "@/app/components/client/utils";
import { trackVideoWatch } from "@/app/lib/client-activity-tracker";
import type { Note, ProjectFile } from "@/app/lib/types";

// تجربة فيديو أسلوب يوتيوب داخل بوابة العميل: صورة مصغّرة من الخارج، وعند
// الضغط عليها يُفتح مشغّل كامل بشريط زمني عليه علامات لكل تعليق (بنفس فكرة
// تبويب "الفيديو" الداخلي لفريق العمل)، مع تحميل بالجودة الأصلية وإمكانية
// إيقاف الفيديو وكتابة تعليق عند اللحظة الفعلية المتوقّف عندها الفيديو —
// بخلاف حقل "دقيقة:ثانية" اليدوي في نافذة "طلب تعديل" العامة، هنا الرقم
// يُلتقط مباشرة من موضع تشغيل الفيديو الحقيقي.
export default function ClientVideoPlayer({
  files,
  comments,
  companyId,
  projectId,
  episodeId,
  userId,
  userName,
  canComment,
  canDownload,
  canRequestEdit,
  canUploadAttachments,
}: {
  files: ProjectFile[];
  comments: Note[];
  companyId: string;
  projectId: string;
  episodeId: string;
  userId: string;
  userName: string | null;
  canComment: boolean;
  canDownload: boolean;
  canRequestEdit: boolean;
  canUploadAttachments: boolean;
}) {
  const [openFile, setOpenFile] = useState<ProjectFile | null>(null);

  if (files.length === 0) {
    return (
      <div className="empty-state card" style={{ padding: 30 }}>
        <Icon name="video" size={30} className="text-muted" />
        <p style={{ marginTop: 8 }}>لا يوجد فيديو لهذه الحلقة بعد.</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {files.map((f) => (
          <VideoThumbCard key={f.id} file={f} onOpen={() => setOpenFile(f)} />
        ))}
      </div>

      {openFile && (
        <VideoPlayerModal
          file={openFile}
          comments={comments.filter((c) => c.target_id === openFile.id)}
          companyId={companyId}
          projectId={projectId}
          episodeId={episodeId}
          userId={userId}
          userName={userName}
          canComment={canComment}
          canDownload={canDownload}
          canRequestEdit={canRequestEdit}
          canUploadAttachments={canUploadAttachments}
          onClose={() => setOpenFile(null)}
        />
      )}
    </>
  );
}

function VideoThumbCard({ file, onOpen }: { file: ProjectFile; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="card card-hover-lift" style={{ padding: 0, overflow: "hidden", textAlign: "start", cursor: "pointer", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000" }}>
        {file.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.thumbnail_url} alt={file.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="video" size={30} className="nav-icon" />
          </div>
        )}
        <span
          style={{
            position: "absolute",
            top: "50%",
            insetInlineStart: "50%",
            transform: "translate(-50%,-50%)",
            width: 50,
            height: 50,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          <Icon name="play" size={20} />
        </span>
        {file.duration_seconds != null && (
          <span
            style={{
              position: "absolute",
              bottom: 8,
              insetInlineEnd: 8,
              background: "rgba(0,0,0,0.7)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 6,
            }}
          >
            {formatDuration(file.duration_seconds)}
          </span>
        )}
      </div>
      <div style={{ padding: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
      </div>
    </button>
  );
}

export function VideoPlayerModal({
  file,
  comments: initialComments,
  companyId,
  projectId,
  episodeId,
  userId,
  userName,
  canComment,
  canDownload,
  canRequestEdit,
  canUploadAttachments,
  onClose,
}: {
  file: ProjectFile;
  comments: Note[];
  companyId: string;
  projectId: string;
  episodeId: string;
  userId: string;
  userName: string | null;
  canComment: boolean;
  canDownload: boolean;
  canRequestEdit: boolean;
  canUploadAttachments: boolean;
  onClose: () => void;
}) {
  const [comments, setComments] = useState(initialComments);
  const [src, setSrc] = useState<string | null>(file.external_url ?? null);
  const [loadingSrc, setLoadingSrc] = useState(!file.external_url);
  const [srcError, setSrcError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [editRequestOpen, setEditRequestOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const maxWatchedRef = useRef(0);
  const watchReportedRef = useRef(false);

  // يُسجَّل حدث "video_watch" مرة واحدة فقط عند إغلاق المشغّل (أو تفكيكه)،
  // بأقصى نقطة مشاهدة وصل إليها العميل فعلياً (وليس فقط آخر موضع للمؤشر،
  // كي لا يُحتسب رجوعه للخلف كنقص في نسبة المشاهدة).
  function reportWatch() {
    if (watchReportedRef.current || maxWatchedRef.current < 3) return;
    watchReportedRef.current = true;
    trackVideoWatch(file.id, maxWatchedRef.current, duration || file.duration_seconds || maxWatchedRef.current, { projectId, episodeId });
  }

  useEffect(() => {
    return () => reportWatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- يُقرأ عبر refs فقط عند التفكيك، لا حاجة لإعادة تشغيله بتغيّر duration
  }, []);

  function handleClose() {
    reportWatch();
    onClose();
  }

  useEffect(() => {
    if (file.external_url) return;
    let cancelled = false;
    fetch(`/api/client-portal/files/${file.id}`)
      .then((res) => res.json())
      .then((json: { url?: string }) => {
        if (!cancelled) setSrc(json.url ?? null);
      })
      .catch(() => {
        if (!cancelled) setSrcError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingSrc(false);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  function seekTo(seconds: number) {
    if (videoRef.current) videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  }

  function onTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    seekTo(ratio * duration);
  }

  function clickMarker(c: Note, e: React.SyntheticEvent) {
    e.stopPropagation();
    if (c.video_timestamp_seconds != null) seekTo(c.video_timestamp_seconds);
    setActiveCommentId((prev) => (prev === c.id ? null : c.id));
  }

  async function submitComment() {
    if (!commentText.trim() || posting) return;
    setPosting(true);
    try {
      const at = Math.max(0, Math.floor(videoRef.current?.currentTime ?? currentTime));
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notes")
        .insert({
          company_id: companyId,
          project_id: projectId,
          episode_id: episodeId,
          target_type: "video",
          target_id: file.id,
          author_id: userId,
          author_role: "client",
          body: commentText.trim(),
          status: "new",
          video_timestamp_seconds: at,
        })
        .select("*")
        .single();
      if (!error && data) {
        setComments((prev) => [...prev, data as Note]);
        setCommentText("");
      }
    } finally {
      setPosting(false);
    }
  }

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/client-portal/files/${file.id}?download=1`);
      const json = (await res.json()) as { url?: string };
      if (json.url) window.open(json.url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  }

  const sortedComments = useMemo(
    () => comments.slice().sort((a, b) => (a.video_timestamp_seconds ?? 0) - (b.video_timestamp_seconds ?? 0)),
    [comments]
  );

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-content modal-content-video" style={{ maxWidth: 720, maxHeight: "92vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <Icon name="video" size={20} className="nav-icon" />
            <h3 style={{ fontSize: 16, fontWeight: 800, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</h3>
            {canRequestEdit && (
              <button className="btn btn-outline" style={{ fontSize: 12, padding: "6px 10px", flexShrink: 0 }} onClick={() => setEditRequestOpen(true)}>
                <Icon name="edit" size={14} /> طلب تعديل
              </button>
            )}
            {canDownload && file.client_can_download && !file.external_url && (
              <button className="btn btn-outline" style={{ fontSize: 12, padding: "6px 10px", flexShrink: 0 }} onClick={handleDownload} disabled={downloading}>
                <Icon name="export" size={14} /> {downloading ? "جارٍ التحضير..." : "تحميل بالجودة الأصلية"}
              </button>
            )}
            <button className="btn btn-ghost" onClick={handleClose} aria-label="إغلاق" style={{ flexShrink: 0 }}>
              <Icon name="close" size={18} />
            </button>
          </div>

          {loadingSrc ? (
            <div className="skeleton" style={{ height: 320, borderRadius: 12 }} />
          ) : src && !srcError ? (
            <video
              ref={videoRef}
              src={src}
              controls
              playsInline
              onTimeUpdate={(e) => {
                const t = e.currentTarget.currentTime;
                setCurrentTime(t);
                if (t > maxWatchedRef.current) maxWatchedRef.current = t;
              }}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onError={() => setSrcError(true)}
              style={{ width: "100%", maxHeight: 420, borderRadius: 12, background: "#000", display: "block" }}
            />
          ) : (
            <div className="empty-state">تعذّر تحميل الفيديو</div>
          )}

          {duration > 0 && (
            <div style={{ marginTop: 12 }}>
              <div dir="ltr" onClick={onTrackClick} style={{ position: "relative", height: 20, cursor: "pointer" }} title="اضغط للانتقال إلى لحظة معينة">
                <div style={{ position: "absolute", top: 8, insetInlineStart: 0, insetInlineEnd: 0, height: 4, borderRadius: 4, background: "var(--border)" }} />
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    insetInlineStart: 0,
                    height: 4,
                    borderRadius: 4,
                    background: "var(--gold)",
                    width: `${(currentTime / duration) * 100}%`,
                  }}
                />
                {sortedComments.map((c) => {
                  const ratio = Math.min(1, Math.max(0, (c.video_timestamp_seconds ?? 0) / duration));
                  return (
                    <button
                      key={c.id}
                      type="button"
                      title={`${formatDuration(c.video_timestamp_seconds)} — ${c.body}`}
                      onClick={(e) => clickMarker(c, e)}
                      style={{
                        position: "absolute",
                        top: 3,
                        insetInlineStart: `calc(${ratio * 100}% - 6px)`,
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: activeCommentId === c.id ? "var(--gold)" : "var(--bg-card)",
                        border: "2px solid var(--gold)",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                <span>{formatDuration(currentTime)}</span>
                <span>{formatDuration(duration)}</span>
              </div>
            </div>
          )}

          {activeCommentId && (
            <div className="chip chip-gold" style={{ marginTop: 10, width: "100%", justifyContent: "flex-start", padding: "8px 12px", whiteSpace: "normal" }}>
              {sortedComments.find((c) => c.id === activeCommentId)?.body}
            </div>
          )}

          {canComment && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                className="input-field"
                placeholder={duration > 0 ? `أضف تعليقاً عند ${formatDuration(currentTime)}...` : "أضف تعليقاً..."}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
              />
              <button className="btn btn-gold" disabled={posting || !commentText.trim()} onClick={submitComment} style={{ flexShrink: 0 }}>
                <Icon name="send" size={15} />
              </button>
            </div>
          )}

          {sortedComments.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>تعليقات الفيديو ({sortedComments.length})</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
                {sortedComments.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={(e) => clickMarker(c, e)}
                    className={activeCommentId === c.id ? "chip chip-gold" : "chip"}
                    style={{ alignItems: "flex-start", flexDirection: "column", gap: 2, padding: "8px 10px", cursor: "pointer", width: "100%", whiteSpace: "normal" }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700 }}>
                      {formatDuration(c.video_timestamp_seconds)} · {c.author_id === userId ? userName || "أنت" : c.author_role === "client" ? "عميل آخر" : "فريق العمل"} ·{" "}
                      {relativeTime(c.created_at)}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 400 }}>{c.body}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
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
          onCreated={(note) => setComments((prev) => [...prev, note])}
        />
      )}
    </ModalPortal>
  );
}
