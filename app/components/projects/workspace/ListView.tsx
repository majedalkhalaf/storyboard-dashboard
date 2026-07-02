import type { WorkspaceProject } from "@/app/lib/workspace-projects";

// عنصر نائب مؤقت — سيُستبدل بعرض List كامل (جدول احترافي بكل الأعمدة المهمة).
export default function ListView({ projects }: { projects: WorkspaceProject[] }) {
  return (
    <div className="empty-state card">
      <p>عرض القائمة (List) — {projects.length} مشروع — قيد الإنشاء</p>
    </div>
  );
}
