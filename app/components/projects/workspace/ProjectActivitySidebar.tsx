import Link from "next/link";
import { relativeTime } from "@/app/components/projects/utils";
import type { WorkspaceActivityItem } from "@/app/lib/workspace-projects";

const ACTION_LABELS: Record<string, string> = {
  project_created: "تم إنشاء مشروع جديد",
  project_updated: "تم تحديث بيانات المشروع",
  project_status_changed: "تم تغيير حالة المشروع",
  episode_created: "تمت إضافة حلقة جديدة",
  episode_updated: "تم تحديث الحلقة",
  episode_status_changed: "تم تغيير حالة الحلقة",
  episode_stage_updated: "تم تحديث مرحلة تنفيذ",
  approval_revoked: "تم إعادة فتح حلقة للمراجعة",
  note_added: "تمت إضافة ملاحظة",
  file_uploaded: "تم رفع ملف جديد",
};

export default function ProjectActivitySidebar({ items }: { items: WorkspaceActivityItem[] }) {
  return (
    <div className="card project-activity-sidebar" style={{ padding: 18, position: "sticky", top: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>آخر النشاطات</h3>

      {items.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "var(--text-muted)" }}>لا يوجد نشاط بعد</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((item) => {
            const content = (
              <>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "var(--bg-hover)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    fontSize: 10.5,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {(item.actor_name || "؟").charAt(0)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                    {ACTION_LABELS[item.action] ?? item.action}
                    {item.project_name && <span style={{ color: "var(--text-muted)" }}> — {item.project_name}</span>}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>{relativeTime(item.created_at)}</div>
                </div>
              </>
            );
            return item.project_id ? (
              <Link
                key={item.id}
                href={`/projects/${item.project_id}`}
                style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 0", borderBottom: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}
              >
                {content}
              </Link>
            ) : (
              <div key={item.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
