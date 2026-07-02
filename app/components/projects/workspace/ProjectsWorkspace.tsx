"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon, { type IconName } from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { logActivity } from "@/app/lib/activity";
import { downloadCsv } from "@/app/lib/csv";
import { PROJECT_STATUSES, PROJECT_TYPES } from "@/app/lib/constants";
import type { ClientRecord, ProjectStatus, ProjectTemplate } from "@/app/lib/types";
import type { WorkspaceActivityItem, WorkspaceProject } from "@/app/lib/workspace-projects";
import ProjectFormModal from "@/app/components/projects/ProjectFormModal";
import ProjectStatsRow from "./ProjectStatsRow";
import ProjectFilterBar, { EMPTY_FILTERS, type WorkspaceFilters } from "./ProjectFilterBar";
import FeaturedProjects from "./FeaturedProjects";
import ProjectActivitySidebar from "./ProjectActivitySidebar";
import CreateFromTemplateModal from "./CreateFromTemplateModal";
import GridView from "./GridView";
import ListView from "./ListView";
import KanbanView from "./KanbanView";
import TimelineView from "./TimelineView";
import CalendarView from "./CalendarView";

type ViewMode = "grid" | "list" | "kanban" | "timeline" | "calendar";

const VIEW_TABS: { key: ViewMode; label: string; icon: IconName }[] = [
  { key: "grid", label: "شبكي", icon: "grid" },
  { key: "kanban", label: "Kanban", icon: "kanban" },
  { key: "list", label: "قائمة", icon: "list" },
  { key: "timeline", label: "زمني", icon: "timeline" },
  { key: "calendar", label: "تقويم", icon: "calendarView" },
];

const VIEW_STORAGE_KEY = "projects-workspace-view";

export default function ProjectsWorkspace({
  companyId,
  projects,
  serviceOptions,
  recentActivity,
  clients,
  templates,
}: {
  companyId: string;
  projects: WorkspaceProject[];
  serviceOptions: string[];
  recentActivity: WorkspaceActivityItem[];
  clients: Pick<ClientRecord, "id" | "name" | "email" | "phone">[];
  templates: ProjectTemplate[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewMode>("grid");
  const [filters, setFilters] = useState<WorkspaceFilters>(EMPTY_FILTERS);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showFromTemplate, setShowFromTemplate] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restores the user's last-used view from localStorage on mount
    if (saved && VIEW_TABS.some((t) => t.key === saved)) setView(saved);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opens create modal from a deep link query param
    if (searchParams.get("new") === "1") setShowNewProject(true);
  }, [searchParams]);

  function changeView(next: ViewMode) {
    setView(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  }

  const yearOptions = useMemo(() => {
    const years = new Set(projects.map((p) => p.created_at.slice(0, 4)));
    return [...years].sort((a, b) => Number(b) - Number(a));
  }, [projects]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return projects.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.client_name ?? "").toLowerCase().includes(q)) return false;
      if (filters.type && p.type !== filters.type) return false;
      if (filters.status && p.status !== filters.status) return false;
      if (filters.service && !p.services.includes(filters.service)) return false;
      if (filters.clientId && p.client_id !== filters.clientId) return false;
      if (filters.year && p.created_at.slice(0, 4) !== filters.year) return false;
      if (filters.month && String(new Date(p.created_at).getMonth() + 1) !== filters.month) return false;
      return true;
    });
  }, [projects, filters]);

  async function handleStatusChange(projectId: string, newStatus: ProjectStatus) {
    const supabase = createClient();
    await supabase.from("projects").update({ status: newStatus }).eq("id", projectId);
    await logActivity(supabase, { companyId, projectId, action: "project_status_changed", details: { status: newStatus } });
    router.refresh();
  }

  function exportCsv() {
    downloadCsv(
      "المشاريع",
      filtered.map((p) => ({
        name: p.name,
        type: PROJECT_TYPES.find((t) => t.value === p.type)?.label ?? p.custom_type ?? p.type ?? "",
        status: PROJECT_STATUSES.find((s) => s.value === p.status)?.label ?? p.status,
        client: p.client_name ?? "",
        progress: `${p.progress}%`,
        episodes: p.episodeCount,
        revenue: p.revenue,
        updated_at: p.updated_at.slice(0, 10),
      })),
      [
        { key: "name", label: "اسم المشروع" },
        { key: "type", label: "النوع" },
        { key: "status", label: "الحالة" },
        { key: "client", label: "العميل" },
        { key: "progress", label: "نسبة الإنجاز" },
        { key: "episodes", label: "عدد الحلقات" },
        { key: "revenue", label: "الإيرادات" },
        { key: "updated_at", label: "آخر تحديث" },
      ]
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 26, fontWeight: 800 }}>مشاريعي</h1>
          <p style={{ fontSize: 13.5, color: "var(--text-secondary)", marginTop: 6 }}>
            إدارة جميع مشاريع الإنتاج والعملاء والحلقات من مكان واحد.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-gold" onClick={() => setShowNewProject(true)}>
            <Icon name="plus" size={16} /> مشروع جديد
          </button>
          <button className="btn btn-outline" onClick={() => setShowFromTemplate(true)}>
            <Icon name="templates" size={16} /> إنشاء من قالب
          </button>
          <button className="btn btn-outline" onClick={exportCsv}>
            <Icon name="export" size={16} /> تصدير
          </button>
          <button className="btn btn-outline" onClick={() => setCompact((v) => !v)} title="خيارات العرض">
            <Icon name="sliders" size={16} /> {compact ? "عرض مريح" : "عرض مضغوط"}
          </button>
        </div>
      </div>

      <ProjectStatsRow projects={projects} />

      <FeaturedProjects projects={projects} />

      <ProjectFilterBar
        filters={filters}
        onChange={setFilters}
        serviceOptions={serviceOptions}
        clientOptions={clients}
        yearOptions={yearOptions}
      />

      <div className="tabs-scroll" style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
        {VIEW_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => changeView(t.key)}
            className="btn-ghost"
            style={{
              padding: "10px 16px",
              borderRadius: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              borderBottom: view === t.key ? "2px solid var(--gold)" : "2px solid transparent",
              color: view === t.key ? "var(--gold)" : "var(--text-secondary)",
              fontWeight: view === t.key ? 700 : 500,
            }}
          >
            <Icon name={t.icon} size={15} /> {t.label}
          </button>
        ))}
        <span style={{ marginInlineStart: "auto", alignSelf: "center", fontSize: 12, color: "var(--text-muted)" }}>
          {filtered.length} من {projects.length} مشروع
        </span>
      </div>

      <div className="projects-workspace-layout" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        <div>
          {view === "grid" && <GridView projects={filtered} compact={compact} />}
          {view === "list" && <ListView projects={filtered} />}
          {view === "kanban" && <KanbanView projects={filtered} onStatusChange={handleStatusChange} />}
          {view === "timeline" && <TimelineView projects={filtered} />}
          {view === "calendar" && <CalendarView projects={filtered} />}
        </div>

        <ProjectActivitySidebar items={recentActivity} />
      </div>

      {showNewProject && <ProjectFormModal clients={clients} onClose={() => setShowNewProject(false)} />}
      {showFromTemplate && (
        <CreateFromTemplateModal templates={templates} clients={clients} onClose={() => setShowFromTemplate(false)} />
      )}
    </div>
  );
}
