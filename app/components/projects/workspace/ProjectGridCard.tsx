"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/app/lib/constants";
import { relativeTime, formatDate } from "@/app/components/projects/utils";
import type { WorkspaceProject } from "@/app/lib/workspace-projects";
import type { ProjectStatus } from "@/app/lib/types";
import FavoriteButton from "./FavoriteButton";
import SmartIndicators from "./SmartIndicators";
import StageProgressBars from "./StageProgressBars";
import ProjectQuickActions from "./ProjectQuickActions";

export default function ProjectGridCard({ project, compact = false }: { project: WorkspaceProject; compact?: boolean }) {
  const supabase = createClient();
  const { company } = useSession();
  const companyId = company!.id;

  const [status, setStatus] = useState<ProjectStatus>(project.status as ProjectStatus);
  const [savingStatus, setSavingStatus] = useState(false);

  const statusInfo = PROJECT_STATUSES.find((s) => s.value === status);
  const typeLabel =
    project.type === "other" ? project.custom_type || "أخرى" : PROJECT_TYPES.find((t) => t.value === project.type)?.label || project.type || "—";

  async function changeStatus(next: ProjectStatus) {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    setSavingStatus(true);
    try {
      await supabase.from("projects").update({ status: next }).eq("id", project.id);
      await logActivity(supabase, { companyId, projectId: project.id, action: "project_status_changed", details: { from: prev, to: next } });
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <Link
      href={`/projects/${project.id}`}
      className="card card-hover-lift project-grid-card animate-fade-in"
      style={{ display: "block", overflow: "hidden" }}
    >
      <div
        style={{
          height: 160,
          position: "relative",
          background: project.cover_image_url
            ? `center/cover no-repeat url(${project.cover_image_url})`
            : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {!project.cover_image_url && <Icon name="projects" size={30} className="text-muted" />}

        <div style={{ position: "absolute", top: 10, insetInlineStart: 10, display: "flex", gap: 6 }}>
          {statusInfo && (
            <span className="chip" style={{ color: statusInfo.color, borderColor: statusInfo.color, background: "rgba(0,0,0,0.55)" }}>
              {statusInfo.label}
            </span>
          )}
        </div>
        <div style={{ position: "absolute", top: 6, insetInlineEnd: 6, background: "rgba(0,0,0,0.4)", borderRadius: 10 }}>
          <FavoriteButton projectId={project.id} initialFavorite={project.isFavorite} />
        </div>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15.5, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {project.name}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11.5, color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="clients" size={11} /> {project.client_name ?? "بدون عميل"}
            </span>
            <span>{typeLabel}</span>
            {project.services[0] && <span>{project.services[0]}{project.services.length > 1 ? ` +${project.services.length - 1}` : ""}</span>}
            {project.location && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="location" size={11} /> {project.location}
              </span>
            )}
          </div>
        </div>

        {!compact && (project.shooting_date || project.delivery_date) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
            {project.shooting_date && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="calendar" size={11} /> تصوير: {formatDate(project.shooting_date)}
              </span>
            )}
            {project.delivery_date && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="calendar" size={11} /> تسليم: {formatDate(project.delivery_date)}
              </span>
            )}
          </div>
        )}

        <SmartIndicators project={project} />

        <div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div className="progress-fill" style={{ width: `${project.progress}%` }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11 }}>
            <span style={{ fontWeight: 700 }}>{Math.round(project.progress)}% مكتمل</span>
            <span style={{ color: "var(--text-muted)" }}>آخر تحديث {relativeTime(project.updated_at)}</span>
          </div>
        </div>

        {!compact && (
          <div
            className="project-card-mini-stats"
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, fontSize: 11, color: "var(--text-secondary)" }}
          >
            <MiniStat icon="episodes" value={project.episodeCount} label="حلقة" />
            <MiniStat icon="checkCircle" value={project.episodesApproved} label="معتمدة" color="var(--success)" />
            <MiniStat icon="clock" value={project.episodesPendingClient} label="بانتظار العميل" color="var(--warning)" />
            <MiniStat icon="video" value={project.episodesInProgress} label="قيد العمل" />
            <MiniStat icon="files" value={project.filesCount} label="ملف" />
            <MiniStat icon="message" value={project.notesCount} label="ملاحظة" />
            <MiniStat icon="team" value={project.contributorsCount} label="مساهم" />
            <MiniStat icon="money" value={`${project.revenue.toLocaleString()}`} label="ر.س" />
          </div>
        )}

        {!compact && <StageProgressBars stageProgress={project.stageProgress} />}

        {!compact && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--text-muted)" }}>
            <span>{project.lastEditorName ? `آخر تعديل: ${project.lastEditorName}` : ""}</span>
            <span>{relativeTime(project.updated_at)}</span>
          </div>
        )}

        {!compact && (
          <div
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="zap" size={11} /> الحالة
            </span>
            <select
              className="input-field"
              value={status}
              disabled={savingStatus}
              onChange={(e) => changeStatus(e.target.value as ProjectStatus)}
              style={{ width: "auto", fontSize: 11.5, padding: "4px 8px", color: statusInfo?.color, fontWeight: 700, borderColor: statusInfo?.color }}
              title="تغيير حالة المشروع"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <ProjectQuickActions projectId={project.id} projectName={project.name} onArchive={() => changeStatus("archived")} />
      </div>
    </Link>
  );
}

function MiniStat({
  icon,
  value,
  label,
  color,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  value: number | string;
  label: string;
  color?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
      <Icon name={icon} size={12} className="text-muted" />
      <span style={{ fontWeight: 700, color: color ?? "var(--text-primary)" }}>{value}</span>
      <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    </div>
  );
}
