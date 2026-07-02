"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/app/lib/constants";
import { relativeTime } from "@/app/components/projects/utils";

export interface DashboardProject {
  id: string;
  name: string;
  type: string | null;
  custom_type: string | null;
  status: string;
  cover_image_url: string | null;
  progress: number;
  updated_at: string;
  delivery_date: string | null;
  client_name: string | null;
  creator_name: string | null;
  episodeCount: number;
  hasPendingApproval: boolean;
}

type TabKey = "all" | "in_progress" | "pending_approval" | "completed" | "overdue";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "in_progress", label: "قيد التنفيذ" },
  { key: "pending_approval", label: "بانتظار الاعتماد" },
  { key: "completed", label: "مكتملة" },
  { key: "overdue", label: "متأخرة" },
];

export default function ProjectsOverviewSection({ projects }: { projects: DashboardProject[] }) {
  const [tab, setTab] = useState<TabKey>("all");
  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    switch (tab) {
      case "in_progress":
        return projects.filter((p) => p.status === "in_progress");
      case "pending_approval":
        return projects.filter((p) => p.hasPendingApproval);
      case "completed":
        return projects.filter((p) => p.status === "completed" || p.status === "delivered");
      case "overdue":
        return projects.filter((p) => p.delivery_date && p.delivery_date < today && !["completed", "delivered", "cancelled"].includes(p.status));
      default:
        return projects;
    }
  }, [projects, tab, today]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>مشاريعي</h2>
        <div className="filter-pills-scroll" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`chip${tab === t.key ? " chip-gold" : ""}`}
              style={{ border: "1px solid var(--border)", cursor: "pointer" }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Icon name="projects" size={30} className="text-muted" />
          <p style={{ marginTop: 8 }}>لا توجد مشاريع في هذا التصنيف</p>
        </div>
      ) : (
        <div className="projects-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
          {filtered.map((p) => (
            <ProjectCardRich key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCardRich({ project }: { project: DashboardProject }) {
  const status = PROJECT_STATUSES.find((s) => s.value === project.status);
  const typeLabel =
    project.type === "other" ? project.custom_type || "أخرى" : PROJECT_TYPES.find((t) => t.value === project.type)?.label || project.type || "—";

  const initials = [project.creator_name, project.client_name].filter(Boolean).map((n) => (n as string).charAt(0));

  return (
    <Link href={`/projects/${project.id}`} className="card card-hover-lift animate-fade-in" style={{ display: "block", overflow: "hidden" }}>
      <div
        style={{
          height: 120,
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
        {!project.cover_image_url && <Icon name="projects" size={26} className="text-muted" />}
        {status && (
          <span
            className="chip"
            style={{ position: "absolute", top: 10, insetInlineStart: 10, color: status.color, borderColor: status.color, background: "rgba(0,0,0,0.5)" }}
          >
            {status.label}
          </span>
        )}
        <span className="chip" style={{ position: "absolute", top: 10, insetInlineEnd: 10, background: "rgba(0,0,0,0.5)", borderColor: "var(--gold)", color: "var(--gold)" }}>
          {Math.round(project.progress)}%
        </span>
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {project.name}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 10 }}>
          {typeLabel} · {project.episodeCount} حلقة
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${project.progress}%` }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <div style={{ display: "flex" }}>
            {initials.map((ch, i) => (
              <span
                key={i}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--gold-dark), var(--gold))",
                  color: "#090909",
                  fontSize: 10,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid var(--bg-card)",
                  marginInlineStart: i > 0 ? -8 : 0,
                }}
              >
                {ch}
              </span>
            ))}
          </div>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{relativeTime(project.updated_at)}</span>
        </div>
      </div>
    </Link>
  );
}
