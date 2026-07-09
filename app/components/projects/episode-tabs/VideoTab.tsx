"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import ModalPortal from "@/app/components/ui/ModalPortal";
import VideoCommentThread from "@/app/components/projects/VideoCommentThread";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { toEmbedUrl } from "@/app/lib/video-embed";
import { uploadEpisodeVideo } from "@/app/lib/video-upload";
import { buildVideoUploadedMessage, buildWhatsappLink } from "@/app/lib/video-notify";
import type { R2UploadController } from "@/app/lib/r2-upload";
import { downloadFile } from "../FilesPanel";
import type { ProjectFile } from "@/app/lib/types";
import type { EpisodeFullDetail, NoteWithAuthor } from "@/app/lib/episode-detail";
import { formatDuration, relativeTime } from "../utils";

export default function VideoTab({
  episode,
  projectName,
  clientName,
  clientPhone,
  onChanged,
}: {
  episode: EpisodeFullDetail;
  projectName: string;
  clientName: string | null;
  clientPhone: string | null;
  onChanged: () => void;
}) {
  // عميل واحد مُستقر عبر عمر المكوّن (وليس عند كل تصيير) لتفادي إعادة تشغيل التأثير أدناه بلا داعٍ
  const supabase = useMemo(() => createClient(), []);
  const { userId, company, profile } = useSession();
  const companyId = company!.id;

  const videoFiles = useMemo(
    () =>
      episode.files
        .filter((f) => f.category === "video")
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [episode.files]
  );
  const linkFiles = useMemo(() => episode.files.filter((f) => f.category === "link"), [episode.files]);
  // فقط التعليقات الأساسية (بلا parent_note_id) تظهر كعلامات على الشريط الزمني —
  // الردود عليها جزء من المحادثة أسفلها، ليست لحظات زمنية مستقلة بذاتها.
  const comments = useMemo(
    () => episode.comments.filter((c) => !c.parent_note_id).sort((a, b) => (a.video_timestamp_seconds ?? 0) - (b.video_timestamp_seconds ?? 0)),
    [episode.comments]
  );

  const [activeFileId, setActiveFileId] = useState<string | null>(videoFiles[0]?.id ?? null);
  const activeFile = videoFiles.find((f) => f.id === activeFileId) ?? videoFiles[0] ?? null;

  const [src, setSrc] = useState<string | null>(null);
  const [loadingSrc, setLoadingSrc] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  const [videoClientVisible, setVideoClientVisible] = useState(true);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadControllerRef = useRef<R2UploadController | null>(null);
  const videoUploadInputRef = useRef<HTMLInputElement>(null);

  const [notifyFile, setNotifyFile] = useState<ProjectFile | null>(null);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [whatsappResult, setWhatsappResult] = useState<{ sent: boolean; error?: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const embedUrl = src ? toEmbedUrl(src) : null;

  const resolveSrc = useCallback(
    async (file: ProjectFile | null) => {
      if (!file) {
        setSrc(null);
        return;
      }
      setLoadingSrc(true);
      let url: string | null = file.external_url ?? null;
      if (!url && file.storage_path && file.bucket_name === "r2") {
        const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
        url = base ? `${base.replace(/\/+$/, "")}/${file.storage_path}` : null;
      } else if (!url && file.storage_path) {
        const { data } = await supabase.storage.from("project-files").createSignedUrl(file.storage_path, 3600);
        url = data?.signedUrl ?? null;
      }
      setSrc(url);
      setLoadingSrc(false);
    },
    [supabase]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- إعادة ضبط عدّاد الوقت/المدة عند تبديل نسخة الفيديو المعروضة
    setDuration(0);
    setCurrentTime(0);
    resolveSrc(activeFile);
  }, [activeFile, resolveSrc]);

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

  function clickMarker(comment: NoteWithAuthor, e: React.SyntheticEvent) {
    e.stopPropagation();
    if (comment.video_timestamp_seconds != null) seekTo(comment.video_timestamp_seconds);
    setActiveCommentId((prev) => (prev === comment.id ? null : comment.id));
  }

  function selectVersion(f: ProjectFile) {
    setActiveFileId(f.id);
    setActiveCommentId(null);
  }

  async function submitComment() {
    if (!commentText.trim() || posting) return;
    setPosting(true);
    try {
      const at = Math.max(0, Math.floor(videoRef.current?.currentTime ?? currentTime));
      await supabase.from("notes").insert({
        company_id: companyId,
        project_id: episode.project_id,
        episode_id: episode.id,
        target_type: "video",
        target_id: activeFile?.id ?? null,
        author_id: userId,
        author_role: profile.role,
        body: commentText.trim(),
        status: "new",
        video_timestamp_seconds: at,
      });
      await logActivity(supabase, {
        companyId,
        projectId: episode.project_id,
        episodeId: episode.id,
        action: "video_comment_added",
        details: { at: formatDuration(at) },
      });
      setCommentText("");
      onChanged();
    } finally {
      setPosting(false);
    }
  }

  async function submitReply(rootId: string, body: string) {
    // الرد يرث توقيت التعليق الأساسي (وليس null) — episode-detail.ts يُميّز
    // "تعليقات الفيديو" عن "الملاحظات العامة" بفحص وجود video_timestamp_seconds
    // من عدمه، فلو تُرك فارغاً ستُصنَّف الردود خطأً كملاحظات عامة وتختفي من هنا.
    const root = episode.comments.find((c) => c.id === rootId);
    await supabase.from("notes").insert({
      company_id: companyId,
      project_id: episode.project_id,
      episode_id: episode.id,
      target_type: "video",
      target_id: root?.target_id ?? activeFile?.id ?? null,
      parent_note_id: rootId,
      author_id: userId,
      author_role: profile.role,
      body,
      status: "new",
      video_timestamp_seconds: root?.video_timestamp_seconds ?? 0,
    });
    await logActivity(supabase, {
      companyId,
      projectId: episode.project_id,
      episodeId: episode.id,
      action: "video_comment_added",
      details: { at: formatDuration(root?.video_timestamp_seconds ?? 0) },
    });
    onChanged();
  }

  // إضافة فيديو مستضاف خارجياً (YouTube/Vimeo أو رابط ملف مباشر) بدل رفعه لمساحة التخزين —
  // يُحفظ كسجل files بتصنيف "video" (وليس "link") فيظهر في مشغّل الفيديو مباشرة، لا في
  // قائمة الروابط الجانبية.
  async function addVideoLink() {
    const url = linkUrl.trim();
    if (!url || addingLink) return;
    setAddingLink(true);
    try {
      const name = linkName.trim() || "فيديو خارجي";
      await supabase.from("files").insert({
        company_id: companyId,
        project_id: episode.project_id,
        episode_id: episode.id,
        uploaded_by: userId,
        uploaded_by_role: profile.role,
        name,
        original_name: name,
        external_url: url,
        category: "video",
        client_visible: true,
        client_can_view: true,
        client_can_download: false,
        status: "ready",
        bucket_name: "project-files",
      });
      await logActivity(supabase, { companyId, projectId: episode.project_id, episodeId: episode.id, action: "video_link_added", details: { url } });
      setLinkName("");
      setLinkUrl("");
      setShowAddLink(false);
      onChanged();
    } finally {
      setAddingLink(false);
    }
  }

  // رفع فيديو مستقل تماماً عن قائمة الملفات العامة أسفل هذا التبويب — نفس خط أنابيب
  // الرفع لكن كإجراء مخصّص لهذه الحلقة، ينتهي بفتح رسالة "تم رفع الفيديو" الجاهزة
  // للعميل إن كان الفيديو مرئياً له.
  async function handleVideoFileSelect(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setUploadError("الملف المختار ليس فيديو");
      return;
    }
    setUploadError(null);
    setUploadProgress(0);
    setUploadingVideo(true);
    try {
      const controller = await uploadEpisodeVideo(
        supabase,
        {
          companyId,
          projectId: episode.project_id,
          episodeId: episode.id,
          uploadedBy: userId,
          uploadedByRole: profile.role,
          clientVisible: videoClientVisible,
          file,
        },
        {
          onProgress: (loaded, total) => setUploadProgress(total > 0 ? Math.round((loaded / total) * 100) : 0),
          onError: (message) => {
            setUploadingVideo(false);
            setUploadError(message);
          },
          onSuccess: (uploadedFile) => {
            setUploadingVideo(false);
            uploadControllerRef.current = null;
            onChanged();
            if (videoClientVisible) openNotifyModal(uploadedFile);
          },
        }
      );
      uploadControllerRef.current = controller;
    } catch (err) {
      setUploadingVideo(false);
      setUploadError(err instanceof Error ? err.message : "تعذّر بدء رفع الفيديو");
    }
  }

  function openNotifyModal(file: ProjectFile) {
    const videoUrl = `${window.location.origin}/client/projects/${episode.project_id}/episodes/${episode.id}`;
    const message = buildVideoUploadedMessage({
      clientName,
      companyName: company!.name,
      projectName,
      episodeTitle: episode.title,
      episodeNumber: episode.number,
      videoUrl,
    });
    setNotifyMessage(message);
    setWhatsappResult(null);
    setCopied(false);
    setNotifyFile(file);
  }

  async function copyNotifyMessage() {
    await navigator.clipboard.writeText(notifyMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function sendNotifyViaWhatsapp() {
    if (!clientPhone) return;
    setSendingWhatsapp(true);
    setWhatsappResult(null);
    try {
      const res = await fetch("/api/notifications/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clientPhone, message: notifyMessage }),
      });
      const json = (await res.json()) as { sent?: boolean; error?: string };
      setWhatsappResult({ sent: Boolean(json.sent), error: json.error });
    } catch {
      setWhatsappResult({ sent: false, error: "تعذّر الاتصال بخادم الإرسال" });
    } finally {
      setSendingWhatsapp(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>رفع فيديو الحلقة</h3>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
              رفع مستقل خاص بفيديو هذه الحلقة — لا علاقة له بقائمة الملفات العامة أدناه
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={videoClientVisible} onChange={(e) => setVideoClientVisible(e.target.checked)} style={{ accentColor: "var(--gold)" }} />
              مرئي للعميل
            </label>
            <button
              className="btn btn-gold"
              style={{ padding: "8px 14px", fontSize: 12.5 }}
              disabled={uploadingVideo}
              onClick={() => videoUploadInputRef.current?.click()}
            >
              <Icon name="fileUp" size={14} /> {uploadingVideo ? `جارٍ الرفع... ${uploadProgress}%` : "رفع فيديو"}
            </button>
            <input
              ref={videoUploadInputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                handleVideoFileSelect(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {uploadingVideo && (
          <div style={{ marginTop: 10, height: 6, borderRadius: 4, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${uploadProgress}%`, background: "var(--gold)", transition: "width 0.2s" }} />
          </div>
        )}
        {uploadError && (
          <p style={{ color: "#EF4444", fontSize: 12.5, marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="alert" size={14} /> {uploadError}
          </p>
        )}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: videoFiles.length === 0 ? 0 : 10 }}>
          {activeFile && !embedUrl && (
            <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => downloadFile(supabase, activeFile)}>
              <Icon name="export" size={13} /> تحميل الفيديو
            </button>
          )}
          <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setShowAddLink((v) => !v)}>
            <Icon name="link" size={13} /> إضافة فيديو برابط (YouTube/Vimeo أو رابط مباشر)
          </button>
        </div>

        {showAddLink && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <input
              className="input-field"
              placeholder="اسم الفيديو (اختياري)"
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              style={{ flex: "1 1 160px" }}
            />
            <input
              className="input-field"
              placeholder="رابط الفيديو..."
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addVideoLink()}
              style={{ flex: "2 1 240px" }}
              dir="ltr"
            />
            <button className="btn btn-gold" style={{ padding: "9px 16px", fontSize: 12 }} disabled={addingLink || !linkUrl.trim()} onClick={addVideoLink}>
              {addingLink ? "جارٍ الإضافة..." : "إضافة"}
            </button>
          </div>
        )}

        {videoFiles.length === 0 ? (
          <div className="empty-state">
            <Icon name="video" size={30} className="text-muted" />
            <p style={{ marginTop: 10 }}>لا يوجد ملف فيديو لهذه الحلقة بعد. ارفعه من زر «رفع فيديو» أعلاه، أو أضف رابط فيديو خارجي.</p>
          </div>
        ) : (
          <>
            {loadingSrc && !src ? (
              <div className="skeleton" style={{ height: 320, borderRadius: 12 }} />
            ) : src ? (
              embedUrl ? (
                <iframe
                  key={activeFile?.id}
                  src={embedUrl}
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  style={{ width: "100%", aspectRatio: "16 / 9", border: "none", borderRadius: 12, display: "block" }}
                />
              ) : (
                <video
                  key={activeFile?.id}
                  ref={videoRef}
                  src={src}
                  controls
                  playsInline
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
                  style={{ width: "100%", maxHeight: 480, borderRadius: 12, background: "#000", display: "block" }}
                />
              )
            ) : (
              <div className="empty-state">تعذّر تحميل رابط الفيديو</div>
            )}

            {duration > 0 && (
              <div style={{ marginTop: 12 }}>
                <div
                  dir="ltr"
                  onClick={onTrackClick}
                  style={{ position: "relative", height: 20, cursor: "pointer" }}
                  title="اضغط للانتقال إلى لحظة معينة"
                >
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
                  {comments.map((c) => {
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
                {comments.find((c) => c.id === activeCommentId)?.body}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                className="input-field"
                placeholder={embedUrl ? "أضف تعليقاً على الفيديو..." : `أضف تعليقاً عند ${formatDuration(currentTime)}...`}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
              />
              <button className="btn btn-gold" disabled={posting || !commentText.trim()} onClick={submitComment} style={{ flexShrink: 0 }}>
                <Icon name="send" size={15} />
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <div className="card" style={{ padding: 14 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>تعليقات الفيديو ({comments.length})</h3>
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            <VideoCommentThread
              comments={episode.comments}
              currentUserId={userId}
              activeRootId={activeCommentId}
              onSelectRoot={(c) => {
                if (c.video_timestamp_seconds != null) seekTo(c.video_timestamp_seconds);
                setActiveCommentId((prev) => (prev === c.id ? null : c.id));
              }}
              onReply={submitReply}
              authorLabel={(c) => c.author_name || "مستخدم"}
              formatDuration={formatDuration}
              relativeTime={relativeTime}
            />
          </div>
        </div>

        {videoFiles.length > 1 && (
          <div className="card" style={{ padding: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>إصدارات سابقة</h3>
            {/* لا يوجد حقل "جودة" في المخطط — هذا مجرّد سجل زمني لتواريخ الرفع، وليس تمييزاً بين جودة منخفضة/عالية */}
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
              ترتيب حسب تاريخ الرفع فقط، لا يوجد تمييز جودة في النظام.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {videoFiles.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => selectVersion(f)}
                  className={f.id === activeFile?.id ? "chip chip-gold" : "chip"}
                  style={{ justifyContent: "space-between", cursor: "pointer", width: "100%" }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{i === 0 ? "الأحدث" : "نسخة سابقة"} — {f.name}</span>
                  <span style={{ fontSize: 10, flexShrink: 0 }}>{relativeTime(f.created_at)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {linkFiles.length > 0 && (
          <div className="card" style={{ padding: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>روابط</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {linkFiles.map((f) => (
                <a
                  key={f.id}
                  href={f.external_url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="chip"
                  style={{ justifyContent: "flex-start", gap: 6, width: "100%" }}
                >
                  <Icon name="link" size={12} /> {f.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {notifyFile && (
        <ModalPortal>
          <div className="modal-overlay" onClick={() => setNotifyFile(null)}>
            <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ color: "#1DB954", display: "inline-flex" }}>
                  <Icon name="checkCircle" size={22} />
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>تم رفع الفيديو بنجاح</h3>
              </div>
              <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 14 }}>
                رسالة جاهزة لإشعار العميل بأن الفيديو رُفع وهو الآن بانتظار المراجعة والاعتماد.
              </p>

              <textarea
                className="input-field"
                readOnly
                value={notifyMessage}
                style={{ minHeight: 150, fontSize: 12.5, lineHeight: 1.7, resize: "vertical" }}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button className="btn btn-outline" style={{ flex: "1 1 140px" }} onClick={copyNotifyMessage}>
                  <Icon name={copied ? "checkCircle" : "copy"} size={15} /> {copied ? "تم النسخ" : "نسخ الرسالة"}
                </button>
                {clientPhone ? (
                  <>
                    <a
                      href={buildWhatsappLink(clientPhone, notifyMessage)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline"
                      style={{ flex: "1 1 140px" }}
                    >
                      <Icon name="phone" size={15} /> فتح واتساب
                    </a>
                    <button className="btn btn-gold" style={{ flex: "1 1 180px" }} disabled={sendingWhatsapp} onClick={sendNotifyViaWhatsapp}>
                      <Icon name="send" size={15} /> {sendingWhatsapp ? "جارٍ الإرسال..." : "إرسال تلقائي عبر واتساب"}
                    </button>
                  </>
                ) : (
                  <p style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    لا يوجد رقم جوال مسجَّل لهذا العميل — انسخ الرسالة وأرسلها يدوياً عبر أي قناة.
                  </p>
                )}
              </div>

              {whatsappResult && (
                <p style={{ fontSize: 12, marginTop: 10, color: whatsappResult.sent ? "#1DB954" : "#F59E0B" }}>
                  {whatsappResult.sent
                    ? "تم الإرسال تلقائياً عبر واتساب بزنس API بنجاح."
                    : whatsappResult.error || "لم يُرسَل تلقائياً — استخدم زر «فتح واتساب» بدلاً من ذلك."}
                </p>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <button className="btn btn-ghost" onClick={() => setNotifyFile(null)}>
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
