"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { PROJECT_STATUSES } from "@/app/lib/constants";
import { fetchClientProjects } from "@/app/lib/client-profile";
import type { Project } from "@/app/lib/types";
import { relativeTime } from "@/app/components/projects/utils";

export default function ProjectsTab({ clientId }: { clientId: string }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [episodeCounts, setEpisodeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchClientProjects(clientId).then(async (rows) => {
      setProjects(rows);
      const ids = rows.map((p) => p.id);
      if (ids.length === 0) return;
      const supabase = createClient();
      const { data } = await supabase.from("episodes").select("project_id").in("project_id", ids);
      const counts: Record<string, number> = {};
      for (const e of data ?? []) {
        counts[e.project_id] = (counts[e.project_id] ?? 0) + 1;
      }
      setEpisodeCounts(counts);
    });
  }, [clientId]);

  if (projects === null) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 260, borderRadius: 14 }} />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="empty-state card">
        <Icon name="projects" size={32} className="text-muted" />
        <p style={{ marginTop: 12 }}>لا توجد مشاريع لهذا العميل بعد</p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
      {projects.map((p) => {
        const status = PROJECT_STATUSES.find((s) => s.value === p.status);
        return (
          <div key={p.id} className="card animate-fade-in" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div
              style={{
                height: 130,
                position: "relative",
                background: p.cover_image_url
                  ? `center/cover no-repeat url(${p.cover_image_url})`
                  : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {!p.cover_image_url && <Icon name="projects" size={28} className="text-muted" />}
              {status && (
                <span
                  className="chip"
                  style={{
                    position: "absolute",
                    top: 8,
                    insetInlineStart: 8,
                    color: status.color,
                    borderColor: status.color,
                    background: "rgba(0,0,0,0.55)",
                  }}
                >
                  {status.label}
                </span>
              )}
            </div>

            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>

              <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--text-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="episodes" size={12} /> {episodeCounts[p.id] ?? 0} فيديو
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon name="money" size={12} /> {(p.budget ?? 0).toLocaleString("en-US")} ر.س
                </span>
              </div>

              <div>
                <div className="progress-bar" style={{ height: 5 }}>
                  <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                  <span>{Math.round(p.progress)}% مكتمل</span>
                  <span>آخر تحديث {relativeTime(p.updated_at)}</span>
                </div>
              </div>

              <Link
                href={`/projects/${p.id}`}
                className="btn btn-outline"
                style={{ textAlign: "center", fontSize: 12, marginTop: "auto" }}
              >
                فتح المشروع
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
