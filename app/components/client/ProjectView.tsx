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
import StatCard from "@/app/components/dashboard/StatCard";
import PerformanceRing from "@/app/components/dashboard/PerformanceRing";
import { createClient } from "@/app/lib/supabase/client";
import { canClient } from "@/app/lib/permissions";
import { projectStatusMeta, relativeTime, formatCurrency, formatDate } from "@/app/components/client/utils";
import { exportClientProjectZip, downloadClientQuickReport, type ExportProgress } from "@/app/lib/client-zip-export";
import type { ClientPermissions, Company, CompanyPipelineStage, Episode, Note, Payment, Project, ProjectFile } from "@/app/lib/types";

interface FinanceSummary {
  projectValue: number;
  paid: number;
  remaining: number;
}

type TabKey = "overview" | "episodes" | "files" | "notes";
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
  pipelineStages,
  currentStageKey,
  files,
  notes,
  totalNotesCount,
  finance,
  lastPayment,
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
  pipelineStages: CompanyPipelineStage[];
  currentStageKey: string | null;
  files: ProjectFile[];
  notes: Note[];
  totalNotesCount: number;
  finance: FinanceSummary | null;
  lastPayment: Payment | null;
  userId: string;
  userName: string | null;
}) {
  useProjectRealtimeRefresh(project.id);
  const approvedSet = new Set(approvedEpisodeIds);
  const status = projectStatusMeta(project.status);
  const showFinance = canClient(permissions, "finance");
  const showPayments = canClient(permissions, "payments");
  const showEpisodes = canClient(permissions, "episodes");
  const showFiles = canClient(permissions, "files");
  const canDownloadProject = canClient(permissions, "download_project");

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: "episodes", label: "الحلقات", show: showEpisodes },
    { key: "overview", label: "نظرة عامة", show: true },
    { key: "files", label: "الملفات", show: showFiles },
    { key: "notes", label: "الملاحظات", show: true },
  ];
  const visibleTabs = tabs.filter((t) => t.show);
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as TabKey | null;
  const initialTab = requestedTab && tabs.some((t) => t.key === requestedTab && t.show) ? requestedTab : showEpisodes ? "episodes" : "overview";
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
      const { data: allFiles } = await supabase.from("files").select("*").eq("project_id", project.id).eq("client_visible", true);
      const rows = (allFiles ?? []) as ProjectFile[];
      const projectFiles = rows.filter((f) => !f.episode_id);
      const episodeFilesByEpisode: Record<string, ProjectFile[]> = {};
      for (const f of rows) {
        if (f.episode_id) (episodeFilesByEpisode[f.episode_id] ??= []).push(f);
      }
      await exportClientProjectZip(project, episodes, projectFiles, episodeFilesByEpisode, setExportProgress);
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
            <div style={{ flex: "1 1 320px", background: "#000", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 220, maxHeight: 320, overflow: "hidden" }}>
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
              {project.delivery_date && (
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
              <button className="btn btn-gold" style={{ fontSize: 12.5 }} onClick={() => setActive("notes")}>
                <Icon name="message" size={14} /> إرسال ملاحظة
              </button>
              {showFiles && (
                <button className="btn btn-outline" style={{ fontSize: 12.5 }} onClick={() => setActive("files")}>
                  <Icon name="files" size={14} /> الملفات
                </button>
              )}
              {canDownloadProject && (
                <button className="btn btn-outline" style={{ fontSize: 12.5 }} onClick={handleExportZip} disabled={exporting}>
                  <Icon name="archive" size={14} /> {exporting ? `${exportProgress?.stage ?? "جارٍ التحميل..."} ${exportProgress?.percent ?? 0}%` : "تحميل المشروع (ZIP)"}
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

      <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr", gap: 20, alignItems: "start", minWidth: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          {/* بطاقات الإحصائيات */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            {showEpisodes && (
              <>
                <StatCard label="إجمالي الحلقات" value={episodes.length} icon="episodes" color="var(--gold)" />
                <StatCard label="حلقات مكتملة" value={episodesCompleted} icon="checkCircle" color="var(--success)" />
                <StatCard label="قيد التنفيذ" value={episodesInProgress} icon="clock" color="#F59E0B" />
                <StatCard label="متبقية" value={episodesRemaining} icon="circle" color="#6B7280" />
              </>
            )}
            {showFiles && <StatCard label="الملفات" value={files.length} icon="files" color="#3987e5" />}
            <StatCard label="الملاحظات" value={totalNotesCount} icon="message" color="#8B5CF6" />
            {showFinance && finance && (
              <>
                <StatCard label="قيمة المشروع" value={formatCurrency(finance.projectValue)} icon="money" color="var(--gold)" />
                <StatCard label="المدفوع" value={formatCurrency(finance.paid)} icon="checkCircle" color="var(--success)" />
                <StatCard label="المتبقي" value={formatCurrency(finance.remaining)} icon="clock" color="#EF4444" />
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

          {active === "overview" && <OverviewTab project={project} showFinance={showFinance} finance={finance} />}

          {active === "episodes" && (
            <EpisodesTab
              project={project}
              episodes={episodes}
              approvedSet={approvedSet}
              episodeFileCounts={episodeFileCounts}
              episodeNoteCounts={episodeNoteCounts}
              userId={userId}
              permissions={permissions}
            />
          )}

          {active === "files" && <FileList files={files} permissions={permissions} emptyLabel="لا توجد ملفات على مستوى المشروع بعد." />}

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

          {/* الملاحظات — جارية ومنجزة */}
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800 }}>الملاحظات</h3>
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
  userId,
  permissions,
}: {
  project: Project;
  episodes: Episode[];
  approvedSet: Set<string>;
  episodeFileCounts: Record<string, number>;
  episodeNoteCounts: Record<string, number>;
  userId: string;
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

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <input className="input-field" placeholder="بحث عن حلقة..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingInlineStart: 34 }} />
          <span style={{ position: "absolute", insetInlineStart: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>
            <Icon name="search" size={15} />
          </span>
        </div>
        <select className="input-field" style={{ width: "auto" }} value={filter} onChange={(e) => setFilter(e.target.value as EpisodeFilter)}>
          <option value="all">جميع الحلقات</option>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: "1 / -1", padding: 40 }}>
            <Icon name="video" size={34} className="nav-icon" />
            <p style={{ marginTop: 10 }}>لا توجد حلقات مطابقة.</p>
          </div>
        ) : (
          filtered.map((ep) => {
            const isApproved = approvedSet.has(ep.id) || ep.status === "approved" || ep.status === "delivered";
            return (
              <EpisodeGridCard
                key={ep.id}
                episode={ep}
                projectId={project.id}
                companyId={project.company_id}
                userId={userId}
                permissions={permissions}
                isApproved={isApproved}
                fileCount={episodeFileCounts[ep.id] ?? 0}
                noteCount={episodeNoteCounts[ep.id] ?? 0}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function OverviewTab({ project, finance, showFinance }: { project: Project; finance: FinanceSummary | null; showFinance: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>تفاصيل المشروع</h3>
        <InfoRow icon="calendar" label="تاريخ التصوير" value={formatDate(project.shooting_date)} />
        <InfoRow icon="calendar" label="تاريخ التسليم" value={formatDate(project.delivery_date)} />
        {project.location && <InfoRow icon="location" label="الموقع" value={project.location} />}
      </div>

      {showFinance && finance && (
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>الملخّص المالي</h3>
          <FinanceRow label="قيمة المشروع" value={formatCurrency(finance.projectValue)} color="var(--text-primary)" />
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
    ...notes.map((n) => ({ id: `note-${n.id}`, title: "ملاحظة جديدة من فريق العمل", icon: "message" as const, color: "#F59E0B", at: n.created_at })),
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
