"use client";

export default function FilesTab({ clientId }: { clientId: string }) {
  return (
    <div className="empty-state card">
      <p>تبويب FilesTab قيد الإنشاء لهذا العميل ({clientId}).</p>
    </div>
  );
}
