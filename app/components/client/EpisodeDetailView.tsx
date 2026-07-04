"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import StatusChip from "@/app/components/client/StatusChip";
import FileList from "@/app/components/client/FileList";
import NotesThread from "@/app/components/client/NotesThread";
import ApproveEpisode from "@/app/components/client/ApproveEpisode";
import EditRequestComposer from "@/app/components/client/EditRequestComposer";
import StatCard from "@/app/components/dashboard/StatCard";
import { createClient } from "@/app/lib/supabase/client";
import { exportEpisodeFilesZip, type ExportProgress } from "@/app/lib/client-zip-export";
import { canClient } from "@/app/lib/permissions";
import { episodeStatusMeta, relativeTime, formatDate } from "@/app/components/client/utils";
import { STAGE_STATUSES, STORYBOARD_SCENE_STATUSES } from "@/app/lib/constants";
import type { ClientPermissions, Episode, EpisodeStage, Note, ProjectFile, StoryboardScene } from "@/app/lib/types";

type TabKey = "overview" | "files" | "notes" | "tasks" | "activity" | "script" | "scenario" | "storyboard" | "reports";

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
  const es = episodeStatusMeta(episode.status);

  const showFiles = canClient(permissions, "files");
  const showScript = canClient(permissions, "script") && Boolean(episode.script);
  const showScenario = canClient(permissions, "scenario") && Boolean(episode.scenario);
  const showStoryboard = canClient(permissions, "storyboard");
  const showTasks = canClient(permissions, "execution_phases") && stages.length > 0;

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: "overview", label: "نظرة عامة", show: true },
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
  const [active, setActive] = useState<TabKey>("overview");
  const [requestOpen, setRequestOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<ExportProgress | null>(null);
  const canDownloadFiles = canClient(permissions, "download_files");

  async function handleDownloadAllFiles() {
    if (downloading) return;
    setDownloading(true);
    try {
      await exportEpisodeFilesZip(episode.title, files, setDownloadProgress);
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
              {downloading ? `${downloadProgress?.stage ?? "جارٍ التحميل..."} ${downloadProgress?.percent ?? 0}%` : "تحميل جميع ملفات الحلقة"}
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

      {/* رأس الحلقة */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
        {episode.cover_image_url && (
          <div style={{ position: "relative", background: "var(--bg-secondary)", display: "flex", justifyContent: "center", alignItems: "center", maxHeight: 340, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={episode.cover_image_url} alt={episode.title} style={{ maxWidth: "100%", maxHeight: 340, width: "auto", height: "auto", objectFit: "contain" }} />
          </div>
        )}
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{episode.number != null ? `الحلقة ${episode.number}` : "حلقة"}</div>
              <h1 className="page-title-size" style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{episode.title}</h1>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                <StatusChip label={es.label} color={es.color} />
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

      <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr", gap: 20, alignItems: "start", minWidth: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          {/* بطاقات الإحصائيات */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            <StatCard label="نسبة الإنجاز" value={`${episode.progress ?? 0}%`} icon="barChart" color="var(--gold)" />
            {showFiles && <StatCard label="الملفات" value={files.length} icon="files" color="#3987e5" />}
            <StatCard label="طلبات التعديل" value={notes.length} icon="edit" color="#8B5CF6" />
            {showTasks && <StatCard label="المهام" value={`${stages.filter((s) => s.status === "completed").length} من ${stages.length}`} icon="tasks" color="var(--success)" />}
            <StatCard
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

          {active === "files" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {canDownloadFiles && files.length > 0 && (
                <button className="btn btn-outline" style={{ alignSelf: "flex-end", fontSize: 13 }} onClick={handleDownloadAllFiles} disabled={downloading}>
                  <Icon name="archive" size={15} />
                  {downloading ? `${downloadProgress?.stage ?? "جارٍ التحميل..."} ${downloadProgress?.percent ?? 0}%` : "تحميل جميع ملفات الحلقة"}
                </button>
              )}
              <FileList files={files} permissions={permissions} emptyLabel="لا توجد ملفات لهذه الحلقة بعد." />
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
