"use client";

export default function ContractsTab({ clientId }: { clientId: string }) {
  return (
    <div className="empty-state card">
      <p>تبويب ContractsTab قيد الإنشاء لهذا العميل ({clientId}).</p>
    </div>
  );
}
