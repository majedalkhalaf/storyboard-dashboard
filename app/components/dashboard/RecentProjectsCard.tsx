/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";

interface ProjectRow {
  id: string;
  name: string;
  cover_image_url: string | null;
  progress: number;
}

export default function RecentProjectsCard({ projects }: { projects: ProjectRow[] }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>المشاريع الأخيرة</h3>
        <Link href="/projects" style={{ fontSize: 12, color: "var(--gold)" }}>
          عرض الكل
        </Link>
      </div>

      {projects.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لا توجد مشاريع بعد</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "var(--bg-hover)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {p.cover_image_url ? (
                  <img src={p.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Icon name="projects" size={16} className="text-muted" />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.name}
                </div>
                <div className="progress-bar" style={{ marginTop: 6 }}>
                  <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>{p.progress}%</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
