import Link from "next/link";
import Icon from "@/app/components/ui/Icon";

interface ProjectRow {
  id: string;
  name: string;
  cover_image_url: string | null;
  progress: number;
  episodeCount: number;
}

export default function ProjectProgressRow({ projects }: { projects: ProjectRow[] }) {
  if (projects.length === 0) return null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>تقدم المشاريع</h2>
        <Link href="/projects" style={{ fontSize: 13, color: "var(--gold)" }}>
          عرض الكل
        </Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="card animate-fade-in" style={{ overflow: "hidden", display: "block" }}>
            <div
              style={{
                height: 90,
                background: p.cover_image_url
                  ? `center/cover no-repeat url(${p.cover_image_url})`
                  : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {!p.cover_image_url && <Icon name="projects" size={20} className="text-muted" />}
            </div>
            <div style={{ padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{p.episodeCount} حلقة</div>
              <div className="progress-bar" style={{ marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${p.progress}%` }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{p.progress}%</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
