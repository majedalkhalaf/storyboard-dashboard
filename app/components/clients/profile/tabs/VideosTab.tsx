"use client";

export default function VideosTab({ clientId }: { clientId: string }) {
  return (
    <div className="empty-state card">
      <p>تبويب VideosTab قيد الإنشاء لهذا العميل ({clientId}).</p>
    </div>
  );
}
