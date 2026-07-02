"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import StatusChip from "@/app/components/client/StatusChip";
import FileList from "@/app/components/client/FileList";
import NotesThread from "@/app/components/client/NotesThread";
import ApproveEpisode from "@/app/components/client/ApproveEpisode";
import { canClient } from "@/app/lib/permissions";
import { episodeStatusMeta, projectStatusMeta, relativeTime, formatCurrency, formatDate } from "@/app/components/client/utils";
import type { ClientPermissions, Company, Episode, Note, Project, ProjectFile } from "@/app/lib/types";

interface FinanceSummary {
  projectValue: number;
  paid: number;
  remaining: number;
}

type TabKey = "overview" | "episodes" | "files" | "notes";

export default function ProjectView({
  project,
  company,
  permissions,
  episodes,
  approvedEpisodeIds,
  files,
  notes,
  finance,
  userId,
  userName,
}: {
  project: Project;
  company: Company | null;
  permissions: ClientPermissions;
  episodes: Episode[];
  approvedEpisodeIds: string[];
  files: ProjectFile[];
  notes: Note[];
  finance: FinanceSummary | null;
  userId: string;
  userName: string | null;
}) {
  const approvedSet = new Set(approvedEpisodeIds);
  const status = projectStatusMeta(project.status);

  const tabs: { key: TabKey; label: string; show: boolean }[] = [
    { key: "overview", label: "نظرة عامة", show: true },
    { key: "episodes", label: "الحلقات", show: canClient(permissions, "episodes") },
    { key: "files", label: "الملفات", show: canClient(permissions, "files") },
    { key: "notes", label: "الملاحظات", show: true },
  ];
  const visibleTabs = tabs.filter((t) => t.show);
  const [active, setActive] = useState<TabKey>("overview");

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* رأس المشروع */}
      <div style={{ marginBottom: 8 }}>
        <Link href="/client" className="btn btn-ghost" style={{ padding: "4px 8px", marginBottom: 10, fontSize: 13 }}>
          <Icon name="arrowRight" size={16} />
          مشاريعي
        </Link>
      </div>

      <div className="card" style={{ overflow: "hidden", marginBottom: 18 }}>
        <div style={{ height: 160, background: "var(--bg-hover)", position: "relative" }}>
          {project.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.cover_image_url} alt={project.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="video" size={40} className="nav-icon" />
            </div>
          )}
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>{project.name}</h1>
              <StatusChip label={status.label} color={status.color} />
            </div>
            <div style={{ minWidth: 180 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)", marginBottom: 5 }}>
                <span>نسبة الإنجاز</span>
                <span style={{ fontWeight: 800, color: "var(--gold)" }}>{project.progress ?? 0}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${project.progress ?? 0}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* التبويبات */}
      <div className="tabs-scroll" style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--border)", marginBottom: 18 }}>
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
        <OverviewTab project={project} company={company} finance={finance} showFinance={canClient(permissions, "finance")} />
      )}

      {active === "episodes" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {episodes.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: "1 / -1", padding: 40 }}>
              <Icon name="video" size={34} className="nav-icon" />
              <p style={{ marginTop: 10 }}>لا توجد حلقات بعد.</p>
            </div>
          ) : (
            episodes.map((ep) => {
              const es = episodeStatusMeta(ep.status);
              const isApproved = approvedSet.has(ep.id) || ep.status === "approved" || ep.status === "delivered";
              return (
                <div key={ep.id} className="shot-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <Link href={`/client/projects/${project.id}/episodes/${ep.id}`} style={{ textDecoration: "none", color: "var(--text-primary)" }}>
                    <div style={{ height: 130, background: "var(--bg-hover)", position: "relative" }}>
                      {ep.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ep.cover_image_url} alt={ep.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Icon name="video" size={30} className="nav-icon" />
                        </div>
                      )}
                      <div style={{ position: "absolute", top: 8, insetInlineStart: 8 }}>
                        <StatusChip label={es.label} color={es.color} />
                      </div>
                    </div>
                    <div style={{ padding: 14 }}>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>
                        {ep.number != null ? `الحلقة ${ep.number}` : "حلقة"}
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{ep.title}</h3>
                      {ep.description && (
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {ep.description}
                        </p>
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 5 }}>
                        <span>{ep.progress ?? 0}%</span>
                        <span>{relativeTime(ep.updated_at)}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${ep.progress ?? 0}%` }} />
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
      )}

      {active === "files" && (
        <FileList files={files} permissions={permissions} emptyLabel="لا توجد ملفات على مستوى المشروع بعد." />
      )}

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
  );
}

function OverviewTab({
  project,
  company,
  finance,
  showFinance,
}: {
  project: Project;
  company: Company | null;
  finance: FinanceSummary | null;
  showFinance: boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
      <div className="card" style={{ padding: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>تفاصيل المشروع</h3>
        <InfoRow icon="calendar" label="تاريخ التصوير" value={formatDate(project.shooting_date)} />
        <InfoRow icon="calendar" label="تاريخ التسليم" value={formatDate(project.delivery_date)} />
        {project.location && <InfoRow icon="location" label="الموقع" value={project.location} />}
      </div>

      {company && (
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>جهة الإنتاج</h3>
          <InfoRow icon="company" label="الشركة" value={company.name} />
          {company.email && <InfoRow icon="mail" label="البريد" value={company.email} />}
          {company.phone && <InfoRow icon="phone" label="الهاتف" value={company.phone} />}
          {company.website && <InfoRow icon="link" label="الموقع" value={company.website} />}
        </div>
      )}

      {showFinance && finance && (
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 14 }}>الملخّص المالي</h3>
          <FinanceRow label="قيمة المشروع" value={formatCurrency(finance.projectValue)} color="var(--text-primary)" />
          <FinanceRow label="المدفوع" value={formatCurrency(finance.paid)} color="#22C55E" />
          <FinanceRow label="المتبقّي" value={formatCurrency(finance.remaining)} color="var(--gold)" />
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Icon>["name"]; label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", fontSize: 14 }}>
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
