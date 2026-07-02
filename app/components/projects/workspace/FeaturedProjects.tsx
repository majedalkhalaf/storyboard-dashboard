import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { PROJECT_STATUSES } from "@/app/lib/constants";
import type { WorkspaceProject } from "@/app/lib/workspace-projects";

export default function FeaturedProjects({ projects }: { projects: WorkspaceProject[] }) {
  const favorites = projects.filter((p) => p.isFavorite);
  if (favorites.length === 0) return null;

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <span style={{ color: "var(--gold)", display: "inline-flex" }}>
          <Icon name="star" size={15} filled />
        </span>
        المشاريع المميزة
      </h2>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
        {favorites.map((p) => {
          const status = PROJECT_STATUSES.find((s) => s.value === p.status);
          return (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card"
              style={{ minWidth: 220, padding: 12, display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: p.cover_image_url ? `center/cover no-repeat url(${p.cover_image_url})` : "var(--bg-hover)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {!p.cover_image_url && <Icon name="projects" size={16} className="text-muted" />}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ fontSize: 11, color: status?.color ?? "var(--text-muted)" }}>{status?.label ?? p.status}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
