"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import StatusChip from "@/app/components/client/StatusChip";
import FileList from "@/app/components/client/FileList";
import NotesThread from "@/app/components/client/NotesThread";
import ProjectStageTimeline from "@/app/components/client/ProjectStageTimeline";
import EpisodeGridCard from "@/app/components/client/EpisodeGridCard";
import ProgressUpdateCard, { type ClientProgressUpdate } from "@/app/components/client/ProgressUpdateCard";
import StatCard from "@/app/components/dashboard/StatCard";
import PerformanceRing from "@/app/components/dashboard/PerformanceRing";
import { createClient } from "@/app/lib/supabase/client";
import { canClient } from "@/app/lib/permissions";
import { useIsMobile } from "@/app/lib/useIsMobile";
import { projectStatusMeta, relativeTime, formatCurrency, formatDate } from "@/app/components/client/utils";
import { exportClientProjectZip, downloadClientQuickReport, type ExportProgress } from "@/app/lib/client-zip-export";
import { getItemNoun, isSpecialEpisodeKind } from "@/app/lib/item-noun";
import type { ClientPermissions, Company, CompanyPipelineStage, Contract, Episode, Invoice, Note, Payment, Project, ProjectFile } from "@/app/lib/types";

interface FinanceSummary {
  projectValue: number;
  paid: number;
  remaining: number;
}

type TabKey = "overview" | "episodes" | "files" | "notes" | "progress";
type EpisodeFilter = "all" | "completed" | "in_progress" | "overdue";
type EpisodeSort = "newest" | "number" | "progress";

// يستمع لأي تعديل حي على حلقات/ملاحظات/ملفات هذا المشروع ويعيد جلب بيانات
// الصفحة من الخادم فوراً — نفس النمط المستخدم في صفحة الحلقة.
function useProjectRealtimeRefresh(projectId: string) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`client-project:${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "episodes", filter: `project_id=eq.${projectId}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `project_id=eq.${projectId}` }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "files", filter: `project_id=eq.${projectId}` }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- router مستقر عبر عمر المكوّن
  }, [projectId]);
}

export default function ProjectView({
  project,
  company,
  clientName,
  permissions,
  episodes,
  approvedEpisodeIds,
  episodeFileCounts,
  episodeNoteCounts,
  episodeUnreadCounts,
  pipelineStages,
  currentStageKey,
  files,
  notes,
  totalNotesCount,
  finance,
  lastPayment,
  progressUpdates,
  userId,
  userName,
}: {
  project: Project;
  company: Company | null;
  clientName: string | null;
  permissions: ClientPermissions;
  episodes: Episode[];
  approvedEpisodeIds: string[];
  episodeFileCounts: Record<string, number>;
  episodeNoteCounts: Record<string, number>;
  episodeUnreadCounts: Record<string, number>;
  pipelineStages: CompanyPipelineStage[];
  currentStageKey: string | null;
  files: ProjectFile[];
  notes: Note[];
  totalNotesCount: number;
  finance: FinanceSummary | null;
  lastPayment: Payment | null;
  progressUpdates: ClientProgressUpdate[];
  userId: string;
  userName: string | null;
}) {
  useProjectRealtimeRefresh(project.id);
  const isMobile = useIsMobile();
  const approvedSet = new Set(approvedEpisodeIds);
  const itemNoun = getItemNoun(project);
  const status = projectStatusMeta(project.status);
  const showFinance = canClient(permissions, "finance");
  const showPayments = canClient(permissions, "payments");
  const showEpisodes = canClient(permissions, "episodes");
  const showFiles = canClient(permissions, "files");
  const canDownloadProject = canClient(permissions, "download_project");
  const showDeliveryDate = canClient(permissions, "show_delivery_date");
  const showProjectValue = canClient(permissions, "show_project_value");

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: "episodes", label: itemNoun.plural, show: showEpisodes },
    { key: "overview", label: "نظرة عامة", show: true },
    { key: "progress", label: "العمل الجاري", show: progressUpdates.length > 0 },
    { key: "files", label: "الملفات", show: showFiles },
    { key: "notes", label: "طلبات التعديل", show: true },
  ];
  const visibleTabs = tabs.filter((t) => t.show);
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as TabKey | null;
  const highlightNoteId = searchParams.get("note");
  const initialTab =
    requestedTab && tabs.some((t) => t.key === requestedTab && t.show)
      ? requestedTab
      : highlightNoteId
        ? "notes"
        : showEpisodes
          ? "episodes"
          : "overview";
  const [active, setActive] = useState<TabKey>(initialTab);

  const episodesCompleted = episodes.filter((e) => e.status === "delivered" || e.status === "approved").length;
  const episodesInProgress = episodes.filter((e) => e.status === "in_progress" || e.status === "in_review" || e.status === "ready_for_approval").length;
  const episodesRemaining = episodes.length - episodesCompleted;

  const openNotes = notes.filter((n) => n.status !== "done" && n.status !== "closed" && n.status !== "rejected");
  const closedNotes = notes.filter((n) => n.status === "done" || n.status === "closed");

  const activity = useMemo(() => buildProjectActivity(files, notes, episodes), [files, notes, episodes]);

  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);

  async function handleExportZip() {
    if (exporting) return;
    setExporting(true);
    try {
      const supabase = createClient();
      const [{ data: allFiles }, { data: allNotes }, { data: contractRows }, { data: invoiceRows }, { data: paymentRows }] = await Promise.all([
        supabase.from("files").select("*").eq("project_id", project.id).eq("client_visible", true),
        supabase.from("notes").select("*").eq("project_id", project.id),
        canClient(permissions, "contracts") ? supabase.from("contracts").select("*").eq("project_id", project.id) : Promise.resolve({ data: [] as Contract[] }),
        showFinance ? supabase.from("invoices").select("*").eq("project_id", project.id) : Promise.resolve({ data: [] as Invoice[] }),
        showPayments ? supabase.from("payments").select("*").eq("project_id", project.id) : Promise.resolve({ data: [] as Payment[] }),
      ]);

      const rows = (allFiles ?? []) as ProjectFile[];
      const projectFiles = rows.filter((f) => !f.episode_id);
      const episodeFilesByEpisode: Record<string, ProjectFile[]> = {};
      for (const f of rows) {
        if (f.episode_id) (episodeFilesByEpisode[f.episode_id] ??= []).push(f);
      }

      const allNotesRows = (allNotes ?? []) as Note[];
      const meetingNotes = allNotesRows.filter((n) => n.target_type === "meeting");
      const otherNotes = allNotesRows.filter((n) => n.target_type !== "meeting");
      const projectNotes = otherNotes.filter((n) => !n.episode_id);
      const episodeNotesByEpisode: Record<string, Note[]> = {};
      for (const n of otherNotes) {
        if (n.episode_id) (episodeNotesByEpisode[n.episode_id] ??= []).push(n);
      }

      await exportClientProjectZip(
        project,
        episodes,
        projectFiles,
        episodeFilesByEpisode,
        {
          finance: showFinance ? finance : null,
          lastPayment: showPayments ? lastPayment : null,
          projectNotes,
          episodeNotesByEpisode,
          meetingNotes,
          contracts: (contractRows ?? []) as Contract[],
          invoices: (invoiceRows ?? []) as Invoice[],
          payments: (paymentRows ?? []) as Payment[],
        },
        setExportProgress
      );
    } finally {
      setExporting(false);
      setExportProgress(null);
    }
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: "0 auto", overflowX: "hidden" }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/client/projects" className="btn btn-ghost" style={{ padding: "4px 8px", marginBottom: 10, fontSize: 13 }}>
          <Icon name="arrowRight" size={16} />
          مشاريعي
        </Link>
      </div>

      {/* رأس المشروع — الصورة والمحتوى جنباً إلى جنب */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {project.cover_image_url && (
            <div style={{ position: "relative", flex: "1 1 320px", background: "var(--bg-secondary)", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 220, maxHeight: 320, overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={project.cover_image_url} alt={project.name} style={{ maxWidth: "100%", maxHeight: 320, width: "auto", height: "auto", objectFit: "contain" }} />
            </div>
          )}
          <div style={{ flex: "1.4 1 380px", padding: 20, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>{project.name}</h1>
              <StatusChip label={status.label} color={status.color} />
            </div>
            {project.description && <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 10, maxWidth: 560 }}>{project.description}</p>}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: "var(--text-muted)", marginBottom: 16 }}>
              {clientName && (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="user" size={13} /> {clientName}
                </span>
              )}
              {project.delivery_date && showDeliveryDate && (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="calendar" size={13} /> التسليم المتوقع: {formatDate(project.delivery_date)}
                </span>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 5 }}>
                <span>نسبة الإنجاز</span>
                <span style={{ fontWeight: 800, color: "var(--gold)" }}>{project.progress ?? 0}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${project.progress ?? 0}%` }} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {canDownloadProject && (
                <button
                  className="btn"
                  style={{ fontSize: 13, fontWeight: 800, background: "var(--gold)", color: "#0A0A0B" }}
                  onClick={handleExportZip}
                  disabled={exporting}
                >
                  <Icon name="archive" size={15} /> {exporting ? `${exportProgress?.stage ?? "جارٍ التحميل..."} ${exportProgress?.percent ?? 0}%` : "تحميل المشروع بالكامل"}
                </button>
              )}
              <button className="btn btn-outline" style={{ fontSize: 12.5 }} onClick={() => setActive("notes")}>
                <Icon name="edit" size={14} /> طلب تعديل جديد
              </button>
              {showFiles && (
                <button className="btn btn-outline" style={{ fontSize: 12.5 }} onClick={() => setActive("files")}>
                  <Icon name="files" size={14} /> الملفات
                </button>
              )}
              <button
                className="btn btn-outline"
                style={{ fontSize: 12.5 }}
                onClick={() => downloadClientQuickReport(project, episodes, notes, showFinance ? finance : null, showPayments ? lastPayment : null)}
              >
                <Icon name="fileCheck" size={14} /> تقرير سريع
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* تقدم المشروع — رسم بياني تفصيلي لتوزيع الحلقات على المراحل */}
      {showEpisodes && pipelineStages.length > 0 && episodes.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>تقدم المشروع حسب المرحلة</h3>
          <StageDistributionChart stages={pipelineStages} episodes={episodes} />
        </div>
      )}

      <div className="client-project-layout" style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr", gap: 20, alignItems: "start", minWidth: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          {/* بطاقات الإحصائيات — على الجوال شريط أفقي مضغوط بدل شبكة كبيرة
              تستهلك مساحة رأسية كبيرة قبل الوصول لتبويبات المحتوى الأساسية. */}
          <div
            className={isMobile ? "mobile-feed-scroll" : undefined}
            style={isMobile ? { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 } : { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}
          >
            {showEpisodes && (
              <>
                <StatCard compact={isMobile} label={`إجمالي ${itemNoun.plural}`} value={episodes.length} icon="episodes" color="var(--gold)" />
                <StatCard compact={isMobile} label="حلقات مكتملة" value={episodesCompleted} icon="checkCircle" color="var(--success)" />
                <StatCard compact={isMobile} label="قيد التنفيذ" value={episodesInProgress} icon="clock" color="#F59E0B" />
                <StatCard compact={isMobile} label="متبقية" value={episodesRemaining} icon="circle" color="#6B7280" />
              </>
            )}
            {showFiles && <StatCard compact={isMobile} label="الملفات" value={files.length} icon="files" color="#3987e5" />}
            <StatCard compact={isMobile} label="طلبات التعديل" value={totalNotesCount} icon="edit" color="#8B5CF6" />
            {showFinance && finance && (
              <>
                {showProjectValue && <StatCard compact={isMobile} label="قيمة المشروع" value={formatCurrency(finance.projectValue)} icon="money" color="var(--gold)" />}
                <StatCard compact={isMobile} label="المدفوع" value={formatCurrency(finance.paid)} icon="checkCircle" color="var(--success)" />
                <StatCard compact={isMobile} label="المتبقي" value={formatCurrency(finance.remaining)} icon="clock" color="#EF4444" />
              </>
            )}
          </div>

          {/* مراحل المشروع */}
          {pipelineStages.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>مراحل المشروع</h3>
              <ProjectStageTimeline stages={pipelineStages} currentStageKey={currentStageKey} />
            </div>
          )}

          {/* التبويبات */}
          <div className="tabs-scroll" style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--border)" }}>
            {visibleTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className="btn btn-ghost"
                style={{
                  borderRadius: 0,
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
            <OverviewTab project={project} showFinance={showFinance} finance={finance} showProjectValue={showProjectValue} showDeliveryDate={showDeliveryDate} />
          )}

          {active === "episodes" && (
            <EpisodesTab
              project={project}
              episodes={episodes}
              approvedSet={approvedSet}
              episodeFileCounts={episodeFileCounts}
              episodeNoteCounts={episodeNoteCounts}
              episodeUnreadCounts={episodeUnreadCounts}
              itemNoun={itemNoun}
              userId={userId}
              userName={userName}
              permissions={permissions}
            />
          )}

          {active === "progress" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {progressUpdates.map((u) => (
                <ProgressUpdateCard key={u.id} update={u} />
              ))}
            </div>
          )}

          {active === "files" && <FileList files={files} permissions={permissions} emptyLabel="لا توجد ملفات على مستوى المشروع بعد." zipTitle={project.name} />}

          {active === "notes" && (
            <NotesThread
              companyId={project.company_id}
              projectId={project.id}
              episodeId={null}
              targetType="project"
              targetId={project.id}
              currentUserId={userId}
              currentUserName={userName}
              permissions={permissions}
              initialNotes={notes}
              highlightNoteId={highlightNoteId}
            />
          )}
        </div>

        {/* القائمة الجانبية */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div className="card" style={{ padding: 18, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <PerformanceRing percent={project.progress ?? 0} label="تقدم المشروع" size={116} />
            <div style={{ width: "100%" }}>
              {project.code && <InfoRow icon="tasks" label="كود المشروع" value={project.code} />}
              {project.type && <InfoRow icon="video" label="نوع المشروع" value={project.type} />}
              {clientName && <InfoRow icon="user" label="العميل" value={clientName} />}
            </div>
          </div>

          {/* النشاطات والمستجدات */}
          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>النشاطات والمستجدات</h3>
            {activity.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا يوجد نشاط بعد</p>
            ) : (
              activity.slice(0, 6).map((a) => (
                <div key={a.id} style={{ display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ color: a.color, background: `${a.color}1a`, borderRadius: 7, padding: 5, display: "inline-flex", flexShrink: 0, height: "fit-content" }}>
                    <Icon name={a.icon} size={12} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600 }}>{a.title}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 1 }}>{relativeTime(a.at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* طلبات التعديل — جارية ومنجزة */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800 }}>طلبات التعديل</h3>
              <button className="btn-ghost" style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700 }} onClick={() => setActive("notes")}>
                عرض الكل
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <span className="chip" style={{ color: "#F59E0B", borderColor: "#F59E0B" }}>
                {openNotes.length} جارية
              </span>
              <span className="chip" style={{ color: "var(--success)", borderColor: "var(--success)" }}>
                {closedNotes.length} منجزة
              </span>
            </div>
            {notes.slice(0, 3).map((n) => (
              <div key={n.id} style={{ fontSize: 11.5, color: "var(--text-secondary)", padding: "6px 0", borderTop: "1px solid var(--border)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {n.body}
              </div>
            ))}
          </div>

          {/* تنقل سريع للحسابات */}
          {showPayments && (
            <button type="button" className="card" style={{ padding: 18, display: "block", width: "100%", textAlign: "start", cursor: "pointer" }} onClick={() => setActive("overview")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 800 }}>الحسابات</h3>
                <Icon name="arrowLeft" size={14} className="text-muted" />
              </div>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                {lastPayment?.paid_date ? `آخر دفعة: ${formatDate(lastPayment.paid_date)} — ${formatCurrency(lastPayment.amount)}` : "لا توجد دفعات مسجّلة بعد"}
              </p>
            </button>
          )}

          {company && (company.email || company.phone || company.website) && (
            <div className="card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{company.name}</h3>
              <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 12 }}>جهة الإنتاج المسؤولة عن مشروعك</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {company.phone && (
                  <a href={`tel:${company.phone}`} className="btn btn-outline" style={{ fontSize: 12, padding: "6px 10px" }}>
                    <Icon name="phone" size={13} />
                  </a>
                )}
                {company.phone && (
                  <a
                    href={`https://wa.me/${company.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn"
                    style={{ fontSize: 12, padding: "6px 10px", background: "#25D366", color: "#fff", fontWeight: 700 }}
                  >
                    <Icon name="phone" size={13} />
                  </a>
                )}
                {company.email && (
                  <a href={`mailto:${company.email}`} className="btn btn-outline" style={{ fontSize: 12, padding: "6px 10px" }}>
                    <Icon name="mail" size={13} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EpisodesTab({
  project,
  episodes,
  approvedSet,
  episodeFileCounts,
  episodeNoteCounts,
  episodeUnreadCounts,
  itemNoun,
  userId,
  userName,
  permissions,
}: {
  project: Project;
  episodes: Episode[];
  approvedSet: Set<string>;
  episodeFileCounts: Record<string, number>;
  episodeNoteCounts: Record<string, number>;
  episodeUnreadCounts: Record<string, number>;
  itemNoun: ReturnType<typeof getItemNoun>;
  userId: string;
  userName: string | null;
  permissions: ClientPermissions;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<EpisodeFilter>("all");
  const [sort, setSort] = useState<EpisodeSort>("number");

  const filtered = useMemo(() => {
    const today = new Date();
    let list = episodes.filter((e) => e.title.toLowerCase().includes(query.trim().toLowerCase()));
    if (filter === "completed") list = list.filter((e) => e.status === "delivered" || e.status === "approved");
    if (filter === "in_progress") list = list.filter((e) => e.status === "in_progress" || e.status === "in_review" || e.status === "ready_for_approval");
    if (filter === "overdue")
      list = list.filter((e) => e.delivery_date && new Date(e.delivery_date) < today && e.status !== "delivered" && e.status !== "approved");

    const sorted = [...list];
    if (sort === "number") sorted.sort((a, b) => (a.number ?? a.sort_order) - (b.number ?? b.sort_order));
    if (sort === "newest") sorted.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    if (sort === "progress") sorted.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
    return sorted;
  }, [episodes, query, filter, sort]);

  const specialEpisodes = filtered.filter((e) => isSpecialEpisodeKind(e.kind));
  const regularEpisodes = filtered.filter((e) => !isSpecialEpisodeKind(e.kind));

  function renderCard(ep: Episode) {
    const isApproved = approvedSet.has(ep.id) || ep.status === "approved" || ep.status === "delivered";
    return (
      <EpisodeGridCard
        key={ep.id}
        episode={ep}
        projectId={project.id}
        companyId={project.company_id}
        userId={userId}
        userName={userName}
        permissions={permissions}
        isApproved={isApproved}
        fileCount={episodeFileCounts[ep.id] ?? 0}
        noteCount={episodeNoteCounts[ep.id] ?? 0}
        itemNoun={itemNoun}
        unreadCount={episodeUnreadCounts[ep.id] ?? 0}
      />
    );
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <input className="input-field" placeholder={`بحث عن ${itemNoun.singular}...`} value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingInlineStart: 34 }} />
          <span style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
            <Icon name="search" size={15} />
          </span>
        </div>
        <select className="input-field" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value as EpisodeFilter)}>
          <option value="all">جميع {itemNoun.plural}</option>
          <option value="completed">مكتملة فقط</option>
          <option value="in_progress">قيد التنفيذ فقط</option>
          <option value="overdue">متأخرة فقط</option>
        </select>
        <select className="input-field" style={{ width: "auto" }} value={sort} onChange={(e) => setSort(e.target.value as EpisodeSort)}>
          <option value="number">ترتيب حسب الرقم</option>
          <option value="newest">الأحدث تحديثاً</option>
          <option value="progress">نسبة الإنجاز</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <Icon name="video" size={34} className="nav-icon" />
          <p style={{ marginTop: 10 }}>لا توجد {itemNoun.plural} مطابقة.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {specialEpisodes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: 0.4 }}>
                المقدمة والمقاطع الخاصة
              </span>
              {specialEpisodes.map(renderCard)}
            </div>
          )}
          {regularEpisodes.length > 0 && (
            <div className="client-episodes-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {regularEpisodes.map(renderCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OverviewTab({
  project,
  finance,
  showFinance,
  showProjectValue,
  showDeliveryDate,
}: {
  project: Project;
  finance: FinanceSummary | null;
  showFinance: boolean;
  showProjectValue: boolean;
  showDeliveryDate: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>تفاصيل المشروع</h3>
        <InfoRow icon="calendar" label="تاريخ التصوير" value={formatDate(project.shooting_date)} />
        {showDeliveryDate && <InfoRow icon="calendar" label="تاريخ التسليم" value={formatDate(project.delivery_date)} />}
        {project.location && <InfoRow icon="location" label="الموقع" value={project.location} />}
      </div>

      {showFinance && finance && (
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>الملخّص المالي</h3>
          {showProjectValue && <FinanceRow label="قيمة المشروع" value={formatCurrency(finance.projectValue)} color="var(--text-primary)" />}
          <FinanceRow label="المدفوع" value={formatCurrency(finance.paid)} color="#1DB954" />
          <FinanceRow label="المتبقّي" value={formatCurrency(finance.remaining)} color="var(--gold)" />
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Icon>["name"]; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontSize: 13.5 }}>
      <Icon name={icon} size={16} className="nav-icon" />
      <span style={{ color: "var(--text-secondary)", minWidth: 90 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function FinanceRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontWeight: 800, color }}>{value}</span>
    </div>
  );
}

interface ProjectActivityItem {
  id: string;
  title: string;
  icon: IconName;
  color: string;
  at: string;
}

// نشاطات آمنة للعميل مبنية من بيانات يملك أصلاً صلاحية رؤيتها (ملفات/ملاحظات/
// حلقات) — وليس من جدول activity_logs الداخلي الذي لا سياسة RLS تتيح للعميل قراءته.
function buildProjectActivity(files: ProjectFile[], notes: Note[], episodes: Episode[]): ProjectActivityItem[] {
  return [
    ...files.map((f) => ({ id: `file-${f.id}`, title: `تم رفع ملف: ${f.name}`, icon: "fileUp" as const, color: "#3987e5", at: f.created_at })),
    ...notes.map((n) => ({ id: `note-${n.id}`, title: "طلب تعديل جديد من فريق العمل", icon: "edit" as const, color: "#F59E0B", at: n.created_at })),
    ...episodes
      .filter((e) => e.status === "delivered" || e.status === "approved")
      .map((e) => ({ id: `episode-${e.id}`, title: `${e.status === "delivered" ? "تم تسليم" : "تم اعتماد"} حلقة "${e.title}"`, icon: "checkCircle" as const, color: "var(--success)", at: e.updated_at })),
  ].sort((a, b) => b.at.localeCompare(a.at));
}

// توزيع الحلقات على مراحل الشركة الفعلية — نسبة الحلقات الواصلة كل مرحلة أو
// تجاوزتها، وليس عدداً وهمياً.
function StageDistributionChart({ stages, episodes }: { stages: CompanyPipelineStage[]; episodes: Episode[] }) {
  const order = new Map(stages.map((s, i) => [s.key, i]));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {stages.map((stage, i) => {
        const reached = episodes.filter((e) => (order.get(e.pipeline_stage) ?? 0) >= i).length;
        const pct = episodes.length ? Math.round((reached / episodes.length) * 100) : 0;
        return (
          <div key={stage.key}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
              <span>{stage.label}</span>
              <span style={{ fontWeight: 700 }}>
                {reached} من {episodes.length} ({pct}%)
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%`, background: stage.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
