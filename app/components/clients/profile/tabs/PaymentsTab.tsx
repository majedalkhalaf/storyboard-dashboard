"use client";

export default function PaymentsTab({ clientId }: { clientId: string }) {
  return (
    <div className="empty-state card">
      <p>تبويب PaymentsTab قيد الإنشاء لهذا العميل ({clientId}).</p>
    </div>
  );
}
