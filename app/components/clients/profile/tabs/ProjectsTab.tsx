"use client";

export default function ProjectsTab({ clientId }: { clientId: string }) {
  return (
    <div className="empty-state card">
      <p>تبويب ProjectsTab قيد الإنشاء لهذا العميل ({clientId}).</p>
    </div>
  );
}
