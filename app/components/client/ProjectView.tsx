"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import StatusChip from "@/app/components/client/StatusChip";
import FileList from "@/app/components/client/FileList";
import NotesThread from "@/app/components/client/NotesThread";
import ApproveEpisode from "@/app/components/client/ApproveEpisode";
import ProjectStageTimeline from "@/app/components/client/ProjectStageTimeline";
import StatCard from "@/app/components/dashboard/StatCard";
import { canClient } from "@/app/lib/permissions";
import { episodeStatusMeta, projectStatusMeta, relativeTime, formatCurrency, formatDate } from "@/app/components/client/utils";
import type { ClientPermissions, Company, CompanyPipelineStage, Episode, Note, Project, ProjectFile } from "@/app/lib/types";

interface FinanceSummary {
  projectValue: number;
  paid: number;
  remaining: number;
}

type TabKey = "overview" | "episodes" | "files" | "notes";
type EpisodeFilter = "all" | "completed" | "in_progress" | "overdue";
type EpisodeSort = "newest" | "number" | "progress";

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
  userId: string;
  userName: string | null;
}) {
  const approvedSet = new Set(approvedEpisodeIds);
  const status = projectStatusMeta(project.status);
  const showFinance = canClient(permissions, "finance");
  const showEpisodes = canClient(permissions, "episodes");
  const showFiles = canClient(permissions, "files");

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: "overview", label: "نظرة عامة", show: true },
    { key: "episodes", label: "الحلقات", show: showEpisodes },
    { key: "files", label: "الملفات", show: showFiles },
    { key: "notes", label: "الملاحظات", show: true },
  ];
  const visibleTabs = tabs.filter((t) => t.show);
  const [active, setActive] = useState<TabKey>("overview");

  const episodesCompleted = episodes.filter((e) => e.status === "delivered" || e.status === "approved").length;
  const episodesInProgress = episodes.filter((e) => e.status === "in_progress" || e.status === "in_review" || e.status === "ready_for_approval").length;
  const episodesRemaining = episodes.length - episodesCompleted;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/client" className="btn btn-ghost" style={{ padding: "4px 8px", marginBottom: 10, fontSize: 13 }}>
          <Icon name="arrowRight" size={16} />
          مشاريعي
        </Link>
      </div>

      {/* رأس المشروع */}
      <div className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
        {project.cover_image_url && (
          <div style={{ background: "#000", display: "flex", justifyContent: "center", maxHeight: 340, overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={project.cover_image_url} alt={project.name} style={{ width: "100%", maxHeight: 340, objectFit: "contain" }} />
          </div>
        )}
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
                <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>{project.name}</h1>
                <StatusChip label={status.label} color={status.color} />
              </div>
              {project.description && <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 10, maxWidth: 560 }}>{project.description}</p>}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: "var(--text-muted)" }}>
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
            </div>

            <div style={{ minWidth: 200 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 5 }}>
                <span>نسبة الإنجاز</span>
                <span style={{ fontWeight: 800, color: "var(--gold)" }}>{project.progress ?? 0}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${project.progress ?? 0}%` }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <button className="btn btn-gold" style={{ fontSize: 12.5 }} onClick={() => setActive("notes")}>
                  <Icon name="message" size={14} /> إرسال ملاحظة
                </button>
                {showFiles && (
                  <button className="btn btn-outline" style={{ fontSize: 12.5 }} onClick={() => setActive("files")}>
                    <Icon name="files" size={14} /> الملفات
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr", gap: 20, alignItems: "start" }}>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12 }}>ملخص المشروع</h3>
            {project.code && <InfoRow icon="tasks" label="كود المشروع" value={project.code} />}
            {project.type && <InfoRow icon="video" label="نوع المشروع" value={project.type} />}
            {clientName && <InfoRow icon="user" label="العميل" value={clientName} />}
            <InfoRow icon="barChart" label="نسبة الإنجاز" value={`${project.progress ?? 0}%`} />
          </div>

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
            const es = episodeStatusMeta(ep.status);
            const isApproved = approvedSet.has(ep.id) || ep.status === "approved" || ep.status === "delivered";
            const overdue = ep.delivery_date && new Date(ep.delivery_date) < new Date() && !isApproved;
            return (
              <div key={ep.id} className="shot-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <Link href={`/client/projects/${project.id}/episodes/${ep.id}`} style={{ textDecoration: "none", color: "var(--text-primary)" }}>
                  <div style={{ background: "#000", maxHeight: 160, overflow: "hidden", display: "flex", justifyContent: "center", position: "relative" }}>
                    {ep.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ep.cover_image_url} alt={ep.title} style={{ width: "100%", maxHeight: 160, objectFit: "contain" }} />
                    ) : (
                      <div style={{ width: "100%", height: 130, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="video" size={30} className="nav-icon" />
                      </div>
                    )}
                    <div style={{ position: "absolute", top: 8, insetInlineStart: 8, display: "flex", gap: 6 }}>
                      <StatusChip label={es.label} color={es.color} />
                      {overdue && <StatusChip label="متأخرة" color="#EF4444" />}
                    </div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>{ep.number != null ? `الحلقة ${ep.number}` : "حلقة"}</div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 8 }}>{ep.title}</h3>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>
                      <span>{ep.progress ?? 0}%</span>
                      <span>{relativeTime(ep.updated_at)}</span>
                    </div>
                    <div className="progress-bar" style={{ marginBottom: 10 }}>
                      <div className="progress-fill" style={{ width: `${ep.progress ?? 0}%`, background: es.color }} />
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Icon name="files" size={12} /> {episodeFileCounts[ep.id] ?? 0}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Icon name="message" size={12} /> {episodeNoteCounts[ep.id] ?? 0}
                      </span>
                      {ep.delivery_date && (
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Icon name="calendar" size={12} /> {formatDate(ep.delivery_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                <div style={{ padding: "0 14px 14px", marginTop: "auto" }}>
                  <ApproveEpisode
                    episodeId={ep.id}
                    projectId={project.id}
                    companyId={project.company_id}
                    currentUserId={userId}
                    status={ep.status}
                    alreadyApproved={isApproved}
                    canApprove={canClient(permissions, "approve_episodes")}
                    variant="card"
                  />
                </div>
              </div>
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
