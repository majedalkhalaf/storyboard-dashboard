import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/app/lib/constants";
import { relativeTime } from "@/app/components/projects/utils";
import type { WorkspaceProject } from "@/app/lib/workspace-projects";
import FavoriteButton from "./FavoriteButton";
import SmartIndicators from "./SmartIndicators";
import StageProgressBars from "./StageProgressBars";
import ProjectQuickActions from "./ProjectQuickActions";

export default function ProjectGridCard({ project, compact = false }: { project: WorkspaceProject; compact?: boolean }) {
  const status = PROJECT_STATUSES.find((s) => s.value === project.status);
  const typeLabel =
    project.type === "other" ? project.custom_type || "أخرى" : PROJECT_TYPES.find((t) => t.value === project.type)?.label || project.type || "—";

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
          {status && (
            <span className="chip" style={{ color: status.color, borderColor: status.color, background: "rgba(0,0,0,0.55)" }}>
              {status.label}
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

        <ProjectQuickActions projectId={project.id} />
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
