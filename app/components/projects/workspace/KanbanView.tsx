import type { WorkspaceProject } from "@/app/lib/workspace-projects";
import type { ProjectStatus } from "@/app/lib/types";

// عنصر نائب مؤقت — سيُستبدل بعرض Kanban كامل (أعمدة حسب الحالة + سحب وإفلات).
export default function KanbanView({
  projects,
  onStatusChange,
}: {
  projects: WorkspaceProject[];
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => void;
}) {
  void onStatusChange;
  return (
    <div className="empty-state card">
      <p>عرض Kanban — {projects.length} مشروع — قيد الإنشاء</p>
    </div>
  );
}
