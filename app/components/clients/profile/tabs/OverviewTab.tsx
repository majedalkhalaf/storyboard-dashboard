"use client";

import { useEffect, useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { PROJECT_STATUSES } from "@/app/lib/constants";
import type { ClientProfileSummary, EpisodeWithProject } from "@/app/lib/client-profile";
import { fetchClientEpisodes, fetchClientProjects } from "@/app/lib/client-profile";
import type { Project } from "@/app/lib/types";
import { relativeTime } from "@/app/components/projects/utils";

export default function OverviewTab({ summary, onGoTab }: { summary: ClientProfileSummary; onGoTab: (tab: string) => void }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeWithProject[] | null>(null);

  useEffect(() => {
    fetchClientProjects(summary.client.id).then(setProjects);
    fetchClientEpisodes(summary.client.id).then(setEpisodes);
  }, [summary.client.id]);

  const remainingPct = summary.invoicesTotal ? Math.round((summary.paidTotal / summary.invoicesTotal) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>الملخص المالي</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
          <Fin label="قيمة العقود" value={summary.contractsValue} color="#CE902F" />
          <Fin label="إجمالي الفواتير" value={summary.invoicesTotal} color="#06B6D4" />
          <Fin label="المدفوع" value={summary.paidTotal} color="#22C55E" />
          <Fin label="المتبقي" value={Math.max(0, summary.invoicesTotal - summary.paidTotal)} color="#EF4444" />
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
            <span>نسبة التحصيل</span>
            <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{remainingPct}%</span>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div className="progress-fill" style={{ width: `${remainingPct}%` }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>أحدث المشاريع</h3>
          <button className="btn-ghost" style={{ fontSize: 12, color: "var(--gold)" }} onClick={() => onGoTab("projects")}>
            عرض الكل ({summary.projectsCount})
          </button>
        </div>
        {projects === null ? (
          <div className="skeleton" style={{ height: 80, borderRadius: 10 }} />
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <Icon name="projects" size={26} className="text-muted" />
            <p style={{ marginTop: 8 }}>لا توجد مشاريع بعد</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {projects.slice(0, 5).map((p) => {
              const info = PROJECT_STATUSES.find((s) => s.value === p.status);
              return (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {info && (
                      <span className="chip" style={{ color: info.color, borderColor: info.color, fontSize: 11 }}>
                        {info.label}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{relativeTime(p.updated_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>أحدث الفيديوهات (الحلقات)</h3>
          <button className="btn-ghost" style={{ fontSize: 12, color: "var(--gold)" }} onClick={() => onGoTab("videos")}>
            عرض الكل ({summary.episodesCount})
          </button>
        </div>
        {episodes === null ? (
          <div className="skeleton" style={{ height: 80, borderRadius: 10 }} />
        ) : episodes.length === 0 ? (
          <div className="empty-state">
            <Icon name="video" size={26} className="text-muted" />
            <p style={{ marginTop: 8 }}>لا توجد حلقات بعد</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {episodes.slice(0, 5).map((e) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{e.title}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 8 }}>{e.project_name}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{Math.round(e.progress)}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Fin({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value.toLocaleString("en-US")} ر.س</div>
    </div>
  );
}
