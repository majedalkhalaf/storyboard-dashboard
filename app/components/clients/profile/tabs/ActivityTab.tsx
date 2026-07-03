"use client";

export default function ActivityTab({ clientId }: { clientId: string }) {
  return (
    <div className="empty-state card">
      <p>تبويب ActivityTab قيد الإنشاء لهذا العميل ({clientId}).</p>
    </div>
  );
}
