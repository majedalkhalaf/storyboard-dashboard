"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import StatusChip from "@/app/components/client/StatusChip";
import FileList from "@/app/components/client/FileList";
import ClientVideoPlayer, { VideoPlayerModal } from "@/app/components/client/ClientVideoPlayer";
import NotesThread from "@/app/components/client/NotesThread";
import ApproveEpisode from "@/app/components/client/ApproveEpisode";
import EditRequestComposer from "@/app/components/client/EditRequestComposer";
import ModalPortal from "@/app/components/ui/ModalPortal";
import StatCard from "@/app/components/dashboard/StatCard";
import DownloadProgressBar from "@/app/components/client/DownloadProgressBar";
import { createClient } from "@/app/lib/supabase/client";
import { useIsMobile } from "@/app/lib/useIsMobile";
import { exportEpisodeFilesZip, type ExportProgress } from "@/app/lib/client-zip-export";
import { runTrackedDownload } from "@/app/lib/download-queue-store";
import { canClient } from "@/app/lib/permissions";
import { episodeStatusMeta, relativeTime, formatDate } from "@/app/components/client/utils";
import { STAGE_STATUSES, STORYBOARD_SCENE_STATUSES } from "@/app/lib/constants";
import { getEpisodeKindLabel, isSpecialEpisodeKind } from "@/app/lib/item-noun";
import type { ClientPermissions, Episode, EpisodeStage, Note, ProjectFile, StoryboardScene } from "@/app/lib/types";

type TabKey = "overview" | "video" | "files" | "notes" | "tasks" | "activity" | "script" | "scenario" | "storyboard" | "reports";

// يستمع لأي تعديل حي (من لوحة الفريق الداخلية أو العميل نفسه) على بيانات هذه
// الحلقة تحديداً — مراحل التنفيذ، الملاحظات، الملفات، أو صف الحلقة نفسه — ويعيد
// جلب بيانات الصفحة من الخادم فوراً بلا حاجة لتحديث المتصفح يدوياً.
function useEpisodeRealtimeRefresh(episodeId: string) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`client-episode:${episodeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "episodes", filter: `id=eq.${episodeId}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "episode_stages", filter: `episode_id=eq.${episodeId}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `episode_id=eq.${episodeId}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "files", filter: `episode_id=eq.${episodeId}` }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router مستقر عبر عمر المكوّن
  }, [episodeId]);
}

interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  color: string;
  at: string;
}

export default function EpisodeDetailView({
  episode,
  projectName,
  clientName,
  projectId,
  companyId,
  permissions,
  files,
  stages,
  stageAssigneeNames,
  storyboardScenes,
  notes,
  alreadyApproved,
  approvedAt,
  approvalNote,
  daysToDelivery,
  userId,
  userName,
}: {
  episode: Episode;
  projectName: string;
  clientName: string | null;
  projectId: string;
  companyId: string;
  permissions: ClientPermissions;
  files: ProjectFile[];
  stages: EpisodeStage[];
  stageAssigneeNames: Record<string, string>;
  storyboardScenes: StoryboardScene[];
  notes: Note[];
  alreadyApproved: boolean;
  approvedAt: string | null;
  approvalNote: string | null;
  daysToDelivery: number | null;
  userId: string;
  userName: string | null;
}) {
  useEpisodeRealtimeRefresh(episode.id);
  const isMobile = useIsMobile();
  const es = episodeStatusMeta(episode.status);

  const showFiles = canClient(permissions, "files");
  const showScript = canClient(permissions, "script") && Boolean(episode.script);
  const showScenario = canClient(permissions, "scenario") && Boolean(episode.scenario);
  const showStoryboard = canClient(permissions, "storyboard");
  const showTasks = canClient(permissions, "execution_phases") && stages.length > 0;
  const canEditEpisode = canClient(permissions, "edit_episode");
  const videoFiles = useMemo(() => files.filter((f) => f.category === "video"), [files]);
  const videoComments = useMemo(() => notes.filter((n) => n.target_type === "video"), [notes]);

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: "overview", label: "نظرة عامة", show: true },
    { key: "video", label: "الفيديو", show: videoFiles.length > 0 },
    { key: "files", label: "الملفات", show: showFiles },
    { key: "notes", label: "طلبات التعديل", show: true },
    { key: "tasks", label: "المهام", show: showTasks },
    { key: "activity", label: "النشاطات", show: true },
    { key: "script", label: "السكربت", show: showScript },
    { key: "scenario", label: "السيناريو", show: showScenario },
    { key: "storyboard", label: "الستوري بورد", show: showStoryboard },
    { key: "reports", label: "التقارير", show: true },
  ];
  const visibleTabs = tabs.filter((t) => t.show);
  const searchParams = useSearchParams();
  // رابط إشعار "طلب تعديل" يحمل ?note=<id> فيُفتح تبويب طلبات التعديل مباشرة.
  const [highlightNoteId] = useState<string | null>(() => searchParams.get("note"));
  const [active, setActive] = useState<TabKey>(() => (highlightNoteId ? "notes" : "overview"));
  const [requestOpen, setRequestOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<ExportProgress | null>(null);
  const canDownloadFiles = canClient(permissions, "download_episode_zip");
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [playingVideoFile, setPlayingVideoFile] = useState<ProjectFile | null>(null);
  const [playingVideoComments, setPlayingVideoComments] = useState<Note[]>([]);

  // تشغيل آخر فيديو مرفوع للحلقة مباشرة من زر التشغيل فوق صورة الغلاف —
  // بنفس منطق بطاقة الحلقة (EpisodeGridCard) عبر مشغّل الفيديو المشترك.
  async function openLatestVideo() {
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
      setPlayingVideoComments((noteRows ?? []) as Note[]);
      setPlayingVideoFile(file);
    } finally {
      setLoadingVideo(false);
    }
  }

  async function handleDownloadAllFiles() {
    if (downloading) return;
    setDownloading(true);
    try {
      // يُسجَّل التصدير في المخزن العام (download-queue-store) فيظهر في اللوحة
      // العائمة الثابتة عبر كل الصفحات، ويستمر (وقابل للإلغاء الحقيقي) حتى لو
      // غادر العميل صفحة الحلقة هذه أثناء التنزيل.
      await runTrackedDownload(episode.title, async ({ signal, onProgress }) => {
        await exportEpisodeFilesZip(
          episode.title,
          files,
          (p) => {
            setDownloadProgress(p);
            onProgress(p.stage, p.percent);
          },
          signal
        );
      });
    } finally {
      setDownloading(false);
      setDownloadProgress(null);
    }
  }


  const activity: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [
      ...files.map((f) => ({ id: `file-${f.id}`, title: "تم رفع ملف", subtitle: f.name, icon: "fileUp" as const, color: "#3987e5", at: f.created_at })),
      ...notes.map((n) => ({ id: `note-${n.id}`, title: "طلب تعديل جديد", subtitle: n.body, icon: "edit" as const, color: "#F59E0B", at: n.created_at })),
      ...stages
        .filter((s) => s.status === "completed" && s.completed_at)
        .map((s) => ({ id: `stage-${s.id}`, title: `تم إنهاء مرحلة "${s.label}"`, subtitle: s.assigned_to ? stageAssigneeNames[s.assigned_to] ?? "" : "", icon: "checkCircle" as const, color: "var(--success)", at: s.completed_at! })),
    ];
    if (alreadyApproved && approvedAt) {
      items.push({ id: "approval", title: "تم الاعتماد النهائي", subtitle: approvalNote ?? "", icon: "checkCircle", color: "var(--success)", at: approvedAt });
    }
    return items.sort((a, b) => b.at.localeCompare(a.at));
  }, [files, notes, stages, stageAssigneeNames, alreadyApproved, approvedAt, approvalNote]);

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: "0 auto", overflowX: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <Link href={`/client/projects/${projectId}`} className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 13 }}>
          <Icon name="arrowRight" size={16} />
          العودة للمشروع
        </Link>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {canClient(permissions, "add_notes") && (
            <button className="btn" style={{ justifyContent: "center", fontWeight: 800, fontSize: 14, padding: "10px 20px" }} onClick={() => setRequestOpen(true)}>
              <Icon name="edit" size={18} />
              طلب تعديل
            </button>
          )}
          {canDownloadFiles && files.length > 0 && (
            <button className="btn btn-outline" style={{ justifyContent: "center", fontSize: 13.5, padding: "10px 16px" }} onClick={handleDownloadAllFiles} disabled={downloading}>
              <Icon name="archive" size={16} />
              {downloading ? "جارٍ التنزيل..." : "تحميل جميع ملفات الحلقة"}
            </button>
          )}
          <ApproveEpisode
            episodeId={episode.id}
            projectId={projectId}
            companyId={companyId}
            currentUserId={userId}
            status={episode.status}
            alreadyApproved={alreadyApproved}
            approvedAt={approvedAt}
            canApprove={canClient(permissions, "approve_episodes")}
            variant="hero"
          />
        </div>
        {downloading && (
          <div style={{ marginTop: 10 }}>
            <DownloadProgressBar stage={downloadProgress?.stage ?? "جارٍ التنزيل..."} percent={downloadProgress?.percent ?? 0} />
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
          onCreated={() => setActive("notes")}
        />
      )}

      {playingVideoFile && (
        <VideoPlayerModal
          file={playingVideoFile}
          comments={playingVideoComments}
          companyId={companyId}
          projectId={projectId}
          episodeId={episode.id}
          userId={userId}
          userName={userName}
          canComment={canClient(permissions, "add_notes")}
          canDownload={canClient(permissions, "download_files")}
          canRequestEdit={canClient(permissions, "add_notes")}
          canUploadAttachments={canClient(permissions, "upload_attachments")}
          onClose={() => setPlayingVideoFile(null)}
        />
      )}

      {editOpen && (
        <EpisodeEditModal
          episodeId={episode.id}
          projectId={projectId}
          title={episode.title}
          description={episode.description}
          coverImageUrl={episode.cover_image_url}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* رأس الحلقة */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
        {episode.cover_image_url && (
          <div style={{ position: "relative", background: "var(--bg-secondary)", display: "flex", justifyContent: "center", alignItems: "center", maxHeight: 340, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={episode.cover_image_url} alt={episode.title} style={{ maxWidth: "100%", maxHeight: 340, width: "auto", height: "auto", objectFit: "contain" }} />
            {videoFiles.length > 0 && (
              <button
                type="button"
                onClick={openLatestVideo}
                aria-label="تشغيل الفيديو"
                disabled={loadingVideo}
                style={{
                  position: "absolute",
                  inset: 0,
                  margin: "auto",
                  width: 64,
                  height: 64,
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
                {loadingVideo ? <span className="skeleton" style={{ width: 18, height: 18, borderRadius: "50%" }} /> : <Icon name="play" size={26} />}
              </button>
            )}
          </div>
        )}
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{episode.number != null ? `الحلقة ${episode.number}` : "حلقة"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800 }}>{episode.title}</h1>
                {canEditEpisode && (
                  <button
                    className="btn-ghost"
                    style={{ padding: 6, borderRadius: 8, flexShrink: 0 }}
                    onClick={() => setEditOpen(true)}
                    title="تعديل بيانات الحلقة"
                    aria-label="تعديل بيانات الحلقة"
                  >
                    <Icon name="edit" size={15} />
                  </button>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                <StatusChip label={es.label} color={es.color} />
                {isSpecialEpisodeKind(episode.kind) && (
                  <span className="chip" style={{ fontSize: 11, color: "var(--gold)", borderColor: "var(--gold)", background: "rgba(var(--gold-rgb),0.12)", fontWeight: 700 }}>
                    <Icon name="sparkles" size={12} /> {getEpisodeKindLabel(episode, "")}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: "var(--text-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="video" size={13} /> {projectName}
                </span>
                {clientName && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon name="user" size={13} /> {clientName}
                  </span>
                )}
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="calendar" size={13} /> أُنشئت {formatDate(episode.created_at)}
                </span>
                {episode.delivery_date && (
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon name="calendar" size={13} /> التسليم: {formatDate(episode.delivery_date)}
                  </span>
                )}
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="clock" size={13} /> آخر تحديث {relativeTime(episode.updated_at)}
                </span>
              </div>
              {episode.description && (
                <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{episode.description}</p>
              )}
            </div>

            <div style={{ minWidth: 200 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 5 }}>
                <span>نسبة الإنجاز</span>
                <span style={{ fontWeight: 800, color: "var(--gold)" }}>{episode.progress ?? 0}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${episode.progress ?? 0}%`, background: es.color }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="client-project-layout" style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr", gap: 20, alignItems: "start", minWidth: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          {/* بطاقات الإحصائيات — شريط أفقي مضغوط على الجوال بدل شبكة كبيرة. */}
          <div
            className={isMobile ? "mobile-feed-scroll" : undefined}
            style={isMobile ? { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 } : { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}
          >
            <StatCard compact={isMobile} label="نسبة الإنجاز" value={`${episode.progress ?? 0}%`} icon="barChart" color="var(--gold)" />
            {showFiles && <StatCard compact={isMobile} label="الملفات" value={files.length} icon="files" color="#3987e5" />}
            <StatCard compact={isMobile} label="طلبات التعديل" value={notes.length} icon="edit" color="#8B5CF6" />
            {showTasks && (
              <StatCard compact={isMobile} label="المهام" value={`${stages.filter((s) => s.status === "completed").length} من ${stages.length}`} icon="tasks" color="var(--success)" />
            )}
            <StatCard
              compact={isMobile}
              label="الوقت المتبقي للتسليم"
              value={daysToDelivery === null ? "غير محدد" : daysToDelivery >= 0 ? `${daysToDelivery} يوم` : "متأخر"}
              icon="clock"
              color={daysToDelivery !== null && daysToDelivery < 0 ? "#EF4444" : "#F59E0B"}
            />
          </div>

          {/* التبويبات */}
          <div className="tabs-scroll" style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--border)" }}>
            {visibleTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className="btn btn-ghost"
                style={{
                  borderRadius: 0,
                  whiteSpace: "nowrap",
                  borderBottom: active === t.key ? "2px solid var(--gold)" : "2px solid transparent",
                  color: active === t.key ? "var(--gold)" : "var(--text-secondary)",
                  fontWeight: 700,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {active === "overview" && (
            <div className="card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>آخر النشاطات</h3>
              {activity.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا يوجد نشاط بعد</p>
              ) : (
                activity.slice(0, 5).map((a) => <ActivityRow key={a.id} item={a} />)
              )}
            </div>
          )}

          {active === "video" && (
            <ClientVideoPlayer
              files={videoFiles}
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
            />
          )}

          {active === "files" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {canDownloadFiles && files.length > 0 && (
                <button className="btn btn-outline" style={{ alignSelf: "flex-end", fontSize: 13 }} onClick={handleDownloadAllFiles} disabled={downloading}>
                  <Icon name="archive" size={15} />
                  {downloading ? "جارٍ التنزيل..." : "تحميل جميع ملفات الحلقة"}
                </button>
              )}
              {downloading && <DownloadProgressBar stage={downloadProgress?.stage ?? "جارٍ التنزيل..."} percent={downloadProgress?.percent ?? 0} />}
              <FileList files={files} permissions={permissions} emptyLabel="لا توجد ملفات لهذه الحلقة بعد." zipTitle={episode.title} />
            </div>
          )}

          {active === "notes" && (
            <NotesThread
              companyId={companyId}
              projectId={projectId}
              episodeId={episode.id}
              targetType="episode"
              targetId={episode.id}
              currentUserId={userId}
              currentUserName={userName}
              permissions={permissions}
              initialNotes={notes}
              highlightNoteId={highlightNoteId}
            />
          )}

          {active === "tasks" && <TasksList stages={stages} assigneeNames={stageAssigneeNames} />}

          {active === "activity" && (
            <div className="card" style={{ padding: 18 }}>
              {activity.length === 0 ? <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا يوجد نشاط بعد</p> : activity.map((a) => <ActivityRow key={a.id} item={a} />)}
            </div>
          )}

          {active === "script" && <TextAccordion title="السكربت" text={episode.script ?? ""} />}
          {active === "scenario" && <TextAccordion title="السيناريو" text={episode.scenario ?? ""} />}

          {active === "storyboard" && <StoryboardTab scenes={storyboardScenes} />}

          {active === "reports" && (
            <div className="card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>تقرير سريع</h3>
              <ReportRow label="نسبة الإنجاز" value={`${episode.progress ?? 0}%`} />
              {showFiles && <ReportRow label="عدد الملفات" value={String(files.length)} />}
              <ReportRow label="عدد طلبات التعديل" value={String(notes.length)} />
              {showTasks && <ReportRow label="المهام المكتملة" value={`${stages.filter((s) => s.status === "completed").length} من ${stages.length}`} />}
              <ReportRow label="أُنشئت منذ" value={relativeTime(episode.created_at)} />
              <ReportRow label="آخر تحديث" value={relativeTime(episode.updated_at)} />
            </div>
          )}
        </div>

        {/* الشريط الجانبي — مراحل التنفيذ */}
        <div style={{ position: "sticky", top: 20 }}>
          {showTasks && (
            <div className="card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>مراحل التنفيذ</h3>
              <StagesTimeline stages={stages} assigneeNames={stageAssigneeNames} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: item.color, background: `${item.color}1a`, borderRadius: 8, padding: 6, display: "inline-flex", flexShrink: 0, height: "fit-content" }}>
        <Icon name={item.icon} size={14} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{item.title}</div>
        {item.subtitle && (
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.subtitle}</div>
        )}
        <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>{relativeTime(item.at)}</div>
      </div>
    </div>
  );
}

function TextAccordion({ title, text }: { title: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "var(--bg-secondary)",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="edit" size={16} className="text-muted" /> {title}
        </span>
        <Icon name="chevronDown" size={16} className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <div style={{ padding: 18 }}>
          <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 14 }}>{text || "لا يوجد محتوى بعد."}</p>
        </div>
      )}
    </div>
  );
}

function TasksList({ stages, assigneeNames }: { stages: EpisodeStage[]; assigneeNames: Record<string, string> }) {
  if (stages.length === 0) {
    return (
      <div className="empty-state card" style={{ padding: 30 }}>
        <Icon name="tasks" size={26} className="text-muted" />
        <p style={{ marginTop: 8 }}>لا توجد مهام بعد.</p>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {stages.map((s) => {
        const meta = STAGE_STATUSES.find((x) => x.value === s.status) ?? STAGE_STATUSES[0];
        return (
          <div key={s.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{s.label}</span>
              <StatusChip label={meta.label} color={meta.color} />
            </div>
            <div className="progress-bar" style={{ marginBottom: 10 }}>
              <div className="progress-fill" style={{ width: `${s.progress ?? 0}%`, background: meta.color }} />
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11.5, color: "var(--text-muted)" }}>
              {s.assigned_to && assigneeNames[s.assigned_to] && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="user" size={12} /> {assigneeNames[s.assigned_to]}
                </span>
              )}
              {s.started_at && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="calendar" size={12} /> بدأت {formatDate(s.started_at)}
                </span>
              )}
              {s.completed_at && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="checkCircle" size={12} /> انتهت {formatDate(s.completed_at)}
                </span>
              )}
              {s.due_date && !s.completed_at && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="clock" size={12} /> موعد التسليم {formatDate(s.due_date)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StagesTimeline({ stages, assigneeNames }: { stages: EpisodeStage[]; assigneeNames: Record<string, string> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {stages.map((stage, idx) => {
        const meta = STAGE_STATUSES.find((s) => s.value === stage.status) ?? STAGE_STATUSES[0];
        const done = stage.status === "completed";
        return (
          <div key={stage.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "stretch" }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: done ? meta.color : "var(--bg-hover)",
                  border: `2px solid ${meta.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  color: done ? "#0A0A0B" : meta.color,
                }}
              >
                {done ? <Icon name="check" size={13} /> : <Icon name="circle" size={8} />}
              </div>
              {idx < stages.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 24, background: "var(--border)" }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: 16, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{stage.label}</span>
                <StatusChip label={meta.label} color={meta.color} />
              </div>
              {stage.status === "in_progress" && (
                <div className="progress-bar" style={{ marginTop: 8 }}>
                  <div className="progress-fill" style={{ width: `${stage.progress ?? 0}%` }} />
                </div>
              )}
              {stage.assigned_to && assigneeNames[stage.assigned_to] && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{assigneeNames[stage.assigned_to]}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StoryboardTab({ scenes }: { scenes: StoryboardScene[] }) {
  if (scenes.length === 0) {
    return (
      <div className="empty-state card" style={{ padding: 30 }}>
        <Icon name="image" size={26} className="text-muted" />
        <p style={{ marginTop: 8 }}>لا توجد لوحات ستوري بورد بعد.</p>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
      {scenes.map((scene) => {
        const meta = STORYBOARD_SCENE_STATUSES.find((s) => s.value === scene.status) ?? STORYBOARD_SCENE_STATUSES[0];
        return (
          <div key={scene.id} className="shot-card" style={{ overflow: "hidden" }}>
            <div style={{ position: "relative", aspectRatio: "16 / 9", overflow: "hidden", background: "var(--bg-hover)", display: "flex", justifyContent: "center", alignItems: "center" }}>
              {scene.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={scene.cover_image_url} alt={scene.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <Icon name="image" size={26} className="text-muted" />
              )}
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{scene.number != null ? `مشهد ${scene.number}` : "مشهد"}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}>{scene.title}</div>
              <StatusChip label={meta.label} color={meta.color} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontWeight: 800 }}>{value}</span>
    </div>
  );
}

// نافذة تعديل بيانات الحلقة من طرف العميل — تظهر فقط خلف صلاحية edit_episode
// التي يفعّلها فريق العمل لعميل بعينه؛ يمر التعديل عبر مسار خادم مخصص
// (service_role) بدل RLS مباشر لأن العميل لا يملك صلاحية تعديل صف الحلقة أصلاً.
function EpisodeEditModal({
  episodeId,
  projectId,
  title,
  description,
  coverImageUrl,
  onClose,
}: {
  episodeId: string;
  projectId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [titleValue, setTitleValue] = useState(title);
  const [descriptionValue, setDescriptionValue] = useState(description ?? "");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(coverImageUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickCover(file: File | null) {
    if (file && file.size > 20 * 1024 * 1024) {
      setError("حجم صورة الغلاف كبير جداً (الحد الأقصى 20 ميجابايت)");
      return;
    }
    setError(null);
    setCoverFile(file);
    if (file) setCoverPreview(URL.createObjectURL(file));
  }

  async function submit() {
    if (!titleValue.trim()) {
      setError("العنوان مطلوب");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("episodeId", episodeId);
      fd.append("projectId", projectId);
      fd.append("title", titleValue.trim());
      fd.append("description", descriptionValue.trim());
      if (coverFile) fd.append("cover", coverFile);
      const res = await fetch("/api/client-portal/episode-edit", { method: "POST", body: fd });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error || "تعذّر حفظ التعديلات");
        setSaving(false);
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("تعذّر حفظ التعديلات");
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
      <div className="modal-overlay" onClick={() => !saving && onClose()}>
        <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Icon name="edit" size={20} className="nav-icon" />
            <h3 style={{ fontSize: 17, fontWeight: 800, flex: 1 }}>تعديل بيانات الحلقة</h3>
            <button className="btn-ghost" style={{ padding: 6, borderRadius: 8 }} onClick={onClose} disabled={saving}>
              <Icon name="close" size={18} />
            </button>
          </div>

          {error && (
            <div className="btn-danger" style={{ display: "block", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>العنوان *</label>
              <input className="input-field" value={titleValue} onChange={(e) => setTitleValue(e.target.value)} placeholder="عنوان الحلقة" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>الوصف</label>
              <textarea
                className="input-field"
                rows={4}
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                style={{ resize: "vertical" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>صورة الغلاف</label>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {coverPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="غلاف" style={{ width: 72, height: 48, objectFit: "cover", borderRadius: 8 }} />
                )}
                <label className="btn btn-outline" style={{ cursor: "pointer" }}>
                  <Icon name="upload" size={14} /> {coverPreview ? "تغيير الصورة" : "اختر صورة"}
                  <input type="file" accept="image/*" hidden onChange={(e) => pickCover(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
              إلغاء
            </button>
            <button className="btn btn-gold" onClick={submit} disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
