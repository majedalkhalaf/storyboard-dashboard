import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { fmtDate } from "@/app/components/finance/format";

interface TaskRow {
  id: string;
  label: string;
  due_date: string;
  projectId: string;
  episodeId: string;
  projectName: string;
}

export default function UpcomingTasksCard({ tasks }: { tasks: TaskRow[] }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>المهام القادمة</h3>
        <Link href="/projects" style={{ fontSize: 12, color: "var(--gold)" }}>
          عرض الكل
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state" style={{ padding: 20 }}>
          <Icon name="checkCircle" size={26} className="text-muted" />
          <p style={{ marginTop: 8, fontSize: 13 }}>لا توجد مهام مستحقة قريباً</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tasks.map((t) => (
            <Link
              key={t.id}
              href={`/projects/${t.projectId}/episodes/${t.episodeId}`}
              style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--gold)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.projectName}</div>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{fmtDate(t.due_date)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
