"use client";

export default function NotesTab({ clientId }: { clientId: string }) {
  return (
    <div className="empty-state card">
      <p>تبويب NotesTab قيد الإنشاء لهذا العميل ({clientId}).</p>
    </div>
  );
}
