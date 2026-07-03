"use client";

export default function OffersTab({ clientId }: { clientId: string }) {
  return (
    <div className="empty-state card">
      <p>تبويب OffersTab قيد الإنشاء لهذا العميل ({clientId}).</p>
    </div>
  );
}
