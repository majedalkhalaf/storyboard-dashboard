"use client";

import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/app/lib/constants";
import { relativeTime } from "./utils";

export interface ProjectListItem {
  id: string;
  name: string;
  type: string | null;
  custom_type: string | null;
  status: string;
  cover_image_url: string | null;
  progress: number;
  updated_at: string;
  client_name: string | null;
}

export default function ProjectCard({ project }: { project: ProjectListItem }) {
  const status = PROJECT_STATUSES.find((s) => s.value === project.status);
  const typeLabel =
    project.type === "other"
      ? project.custom_type || "أخرى"
      : PROJECT_TYPES.find((t) => t.value === project.type)?.label || project.type || "—";

  return (
    <Link href={`/projects/${project.id}`} className="card animate-fade-in" style={{ display: "block", overflow: "hidden" }}>
      <div
        style={{
          height: 130,
          background: project.cover_image_url
            ? `center/cover no-repeat url(${project.cover_image_url})`
            : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {!project.cover_image_url && <Icon name="image" size={30} className="text-muted" />}
      </div>

      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
          <span className="chip chip-gold">{typeLabel}</span>
          {status && (
            <span className="chip" style={{ color: status.color, borderColor: status.color }}>
              {status.label}
            </span>
          )}
        </div>

        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{project.name}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="clients" size={12} /> {project.client_name || "بدون عميل"}
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${project.progress}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "var(--text-muted)" }}>
          <span>{Math.round(project.progress)}% مكتمل</span>
          <span>{relativeTime(project.updated_at)}</span>
        </div>
      </div>
    </Link>
  );
}
