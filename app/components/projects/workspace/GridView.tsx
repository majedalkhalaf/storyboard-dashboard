import Icon from "@/app/components/ui/Icon";
import type { WorkspaceProject } from "@/app/lib/workspace-projects";
import ProjectGridCard from "./ProjectGridCard";

export default function GridView({ projects, compact = false }: { projects: WorkspaceProject[]; compact?: boolean }) {
  if (projects.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="projects" size={32} className="text-muted" />
        <p style={{ marginTop: 10 }}>لا توجد مشاريع مطابقة</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${compact ? 240 : 320}px, 1fr))`, gap: compact ? 14 : 18 }}>
      {projects.map((p) => (
        <ProjectGridCard key={p.id} project={p} compact={compact} />
      ))}
    </div>
  );
}
