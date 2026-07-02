import Link from "next/link";
import { relativeTime } from "@/app/components/projects/utils";

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
};

interface ActivityRow {
  id: string;
  action: string;
  actor_name: string | null;
  created_at: string;
  projectId: string | null;
}

export default function RecentActivityCard({ items }: { items: ActivityRow[] }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>النشاط الأخير</h3>
      </div>

      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا يوجد نشاط بعد</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {items.map((item) => {
            const content = (
              <>
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--bg-hover)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    fontSize: 11,
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
                  <div style={{ fontSize: 13 }}>
                    {ACTION_LABELS[item.action] ?? item.action}
                    {item.actor_name && <span style={{ color: "var(--text-muted)" }}> — {item.actor_name}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{relativeTime(item.created_at)}</div>
                </div>
              </>
            );
            return item.projectId ? (
              <Link
                key={item.id}
                href={`/projects/${item.projectId}`}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)", textDecoration: "none", color: "inherit" }}
              >
                {content}
              </Link>
            ) : (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
