"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import Icon from "@/app/components/ui/Icon";
import { PROJECT_STATUSES } from "@/app/lib/constants";
import type { ProjectStatus } from "@/app/lib/types";
import type { WorkspaceProject } from "@/app/lib/workspace-projects";
import FavoriteButton from "./FavoriteButton";

export default function KanbanView({
  projects,
  onStatusChange,
}: {
  projects: WorkspaceProject[];
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => Promise<void>;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columns = useMemo(
    () =>
      PROJECT_STATUSES.map((status) => ({
        status,
        items: projects.filter((p) => p.status === status.value),
      })),
    [projects]
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const projectId = String(active.id);
    const newStatus = PROJECT_STATUSES.find((s) => s.value === over.id)?.value;
    if (!newStatus) return;
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.status === newStatus) return;
    void onStatusChange(projectId, newStatus);
  }

  if (projects.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="kanban" size={32} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا توجد مشاريع مطابقة</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="kanban-container" style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
        {columns.map((col) => (
          <KanbanColumn key={col.status.value} status={col.status} projects={col.items} />
        ))}
      </div>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  projects,
}: {
  status: { value: ProjectStatus; label: string; color: string };
  projects: WorkspaceProject[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status.value });

  return (
    <div
      ref={setNodeRef}
      className="kanban-col"
      style={{
        flex: "0 0 280px",
        minWidth: 280,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderTop: `3px solid ${status.color}`,
        borderRadius: "var(--card-radius)",
        outline: isOver ? `2px solid ${status.color}` : "none",
        outlineOffset: -2,
        transition: "outline 0.12s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, color: status.color }}>{status.label}</span>
        <span
          className="chip"
          style={{ color: status.color, borderColor: status.color, background: `${status.color}14`, fontSize: 11 }}
        >
          {projects.length}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 10, minHeight: 80, flex: 1 }}>
        {projects.length === 0 ? (
          <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>لا توجد مشاريع</p>
        ) : (
          projects.map((p) => <KanbanCard key={p.id} project={p} />)
        )}
      </div>
    </div>
  );
}

function KanbanCard({ project }: { project: WorkspaceProject }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id });

  return (
    <div
      ref={setNodeRef}
      className="card"
      style={{
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        opacity: isDragging ? 0.5 : 1,
        position: isDragging ? "relative" : undefined,
        zIndex: isDragging ? 10 : undefined,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
        <Link
          href={`/projects/${project.id}`}
          style={{ fontWeight: 700, fontSize: 12.5, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {project.name}
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
          <FavoriteButton projectId={project.id} initialFavorite={project.isFavorite} size={13} />
          <span {...attributes} {...listeners} style={{ cursor: "grab", display: "flex", padding: 4, touchAction: "none" }} title="اسحب لتغيير الحالة">
            <Icon name="grip" size={13} className="text-muted" />
          </span>
        </div>
      </div>

      <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
        <Icon name="clients" size={10} /> {project.client_name ?? "بدون عميل"}
      </div>

      <div>
        <div className="progress-bar" style={{ height: 4 }}>
          <div className="progress-fill" style={{ width: `${project.progress}%` }} />
        </div>
        <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 3 }}>{Math.round(project.progress)}% مكتمل</div>
      </div>
    </div>
  );
}
