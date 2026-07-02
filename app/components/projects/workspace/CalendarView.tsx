import type { WorkspaceProject } from "@/app/lib/workspace-projects";

// عنصر نائب مؤقت — سيُستبدل بعرض تقويم شهري لمواعيد التصوير والتسليم.
export default function CalendarView({ projects }: { projects: WorkspaceProject[] }) {
  return (
    <div className="empty-state card">
      <p>عرض التقويم — {projects.length} مشروع — قيد الإنشاء</p>
    </div>
  );
}
