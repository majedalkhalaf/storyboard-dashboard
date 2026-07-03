"use client";

export default function InvoicesTab({ clientId }: { clientId: string }) {
  return (
    <div className="empty-state card">
      <p>تبويب InvoicesTab قيد الإنشاء لهذا العميل ({clientId}).</p>
    </div>
  );
}
