import type { WorkspaceProject } from "@/app/lib/workspace-projects";

// عنصر نائب مؤقت — سيُستبدل بمخطط زمني (Timeline/Gantt) حسب تواريخ التصوير والتسليم.
export default function TimelineView({ projects }: { projects: WorkspaceProject[] }) {
  return (
    <div className="empty-state card">
      <p>عرض Timeline — {projects.length} مشروع — قيد الإنشاء</p>
    </div>
  );
}
