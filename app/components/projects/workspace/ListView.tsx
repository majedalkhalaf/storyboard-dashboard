"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/app/lib/constants";
import { relativeTime } from "@/app/components/projects/utils";
import type { WorkspaceProject } from "@/app/lib/workspace-projects";
import FavoriteButton from "./FavoriteButton";

type SortKey = "name" | "client" | "type" | "status" | "progress" | "episodes" | "files" | "revenue" | "updated_at";

const SORTABLE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "المشروع" },
  { key: "client", label: "العميل" },
  { key: "type", label: "النوع" },
  { key: "status", label: "الحالة" },
  { key: "progress", label: "الإنجاز" },
  { key: "episodes", label: "الحلقات" },
  { key: "files", label: "الملفات" },
  { key: "revenue", label: "الإيرادات" },
  { key: "updated_at", label: "آخر تحديث" },
];

function typeLabel(project: WorkspaceProject): string {
  if (project.type === "other") return project.custom_type || "أخرى";
  return PROJECT_TYPES.find((t) => t.value === project.type)?.label || project.type || "—";
}

function sortValue(project: WorkspaceProject, key: SortKey): string | number {
  switch (key) {
    case "name":
      return project.name;
    case "client":
      return project.client_name ?? "";
    case "type":
      return typeLabel(project);
    case "status":
      return PROJECT_STATUSES.find((s) => s.value === project.status)?.label ?? project.status;
    case "progress":
      return project.progress;
    case "episodes":
      return project.episodeCount;
    case "files":
      return project.filesCount;
    case "revenue":
      return project.revenue;
    case "updated_at":
      return project.updated_at;
  }
}

export default function ListView({ projects }: { projects: WorkspaceProject[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const copy = [...projects];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv), "ar");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [projects, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  if (projects.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="list" size={32} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا توجد مشاريع مطابقة</p>
      </div>
    );
  }

  return (
    <div className="card table-scroll" style={{ overflow: "hidden" }}>
      <table className="data-table">
        <thead>
          <tr>
            {SORTABLE_COLUMNS.map((col) => (
              <th key={col.key} style={{ cursor: "pointer", userSelect: "none" }} onClick={() => toggleSort(col.key)}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {col.label}
                  {sortKey === col.key && <Icon name={sortDir === "asc" ? "chevronRight" : "chevronDown"} size={12} />}
                </span>
              </th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((project) => {
            const status = PROJECT_STATUSES.find((s) => s.value === project.status);
            return (
              <tr key={project.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 160 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        flexShrink: 0,
                        background: project.cover_image_url
                          ? `center/cover no-repeat url(${project.cover_image_url})`
                          : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {!project.cover_image_url && <Icon name="projects" size={14} className="text-muted" />}
                    </div>
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {project.name}
                    </span>
                  </div>
                </td>
                <td>{project.client_name ?? "—"}</td>
                <td>{typeLabel(project)}</td>
                <td>
                  {status && (
                    <span className="chip" style={{ color: status.color, borderColor: status.color, background: `${status.color}14` }}>
                      {status.label}
                    </span>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 100 }}>
                    <div className="progress-bar" style={{ flex: 1, height: 4 }}>
                      <div className="progress-fill" style={{ width: `${project.progress}%` }} />
                    </div>
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)", flexShrink: 0 }}>{Math.round(project.progress)}%</span>
                  </div>
                </td>
                <td>{project.episodeCount}</td>
                <td>{project.filesCount}</td>
                <td>{project.revenue.toLocaleString("en-US")} ر.س</td>
                <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)", fontSize: 12.5 }}>{relativeTime(project.updated_at)}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Link href={`/projects/${project.id}`} className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 12.5 }}>
                      فتح
                    </Link>
                    <FavoriteButton projectId={project.id} initialFavorite={project.isFavorite} size={15} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
