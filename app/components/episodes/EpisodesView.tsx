"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { EPISODE_STATUSES } from "@/app/lib/constants";
import type { EpisodeStatus } from "@/app/lib/types";
import EpisodeListCard, { type EpisodeListItem } from "./EpisodeListCard";
import NewEpisodeModal from "./NewEpisodeModal";

interface ProjectOption {
  id: string;
  name: string;
}

export default function EpisodesView({
  episodes,
  projects,
}: {
  episodes: EpisodeListItem[];
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EpisodeStatus | "">("");
  const [projectFilter, setProjectFilter] = useState("");
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- opens create modal from a deep link query param
    if (searchParams.get("new") === "1") setShowModal(true);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return episodes.filter((e) => {
      if (q && !e.title.toLowerCase().includes(q) && !e.project_name.toLowerCase().includes(q)) return false;
      if (statusFilter && e.status !== statusFilter) return false;
      if (projectFilter && e.project_id !== projectFilter) return false;
      return true;
    });
  }, [episodes, search, statusFilter, projectFilter]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title-size" style={{ fontSize: 24, fontWeight: 800 }}>
            الحلقات
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{episodes.length} حلقة</p>
        </div>
        <button className="btn btn-gold" onClick={() => setShowModal(true)}>
          <Icon name="plus" size={16} /> حلقة جديدة
        </button>
      </div>

      {/* شريط البحث والفلاتر */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}>
            <Icon name="search" size={16} />
          </span>
          <input
            className="input-field"
            placeholder="ابحث بعنوان الحلقة أو اسم المشروع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingRight: 38 }}
          />
        </div>
        <select
          className="input-field"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as EpisodeStatus | "")}
          style={{ width: "auto", minWidth: 150 }}
        >
          <option value="">كل الحالات</option>
          {EPISODE_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className="input-field"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{ width: "auto", minWidth: 150 }}
        >
          <option value="">كل المشاريع</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state card">
          <Icon name="episodes" size={36} className="text-muted" />
          <p style={{ marginTop: 12 }}>{episodes.length === 0 ? "لا توجد حلقات بعد" : "لا توجد نتائج مطابقة"}</p>
          {episodes.length === 0 && (
            <button className="btn btn-gold" style={{ marginTop: 14 }} onClick={() => setShowModal(true)}>
              <Icon name="plus" size={16} /> إنشاء أول حلقة
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
          {filtered.map((e) => (
            <EpisodeListCard key={e.id} episode={e} />
          ))}
        </div>
      )}

      {showModal && (
        <NewEpisodeModal
          projects={projects}
          episodes={episodes}
          onClose={() => setShowModal(false)}
          onCreated={() => router.refresh()}
        />
      )}
    </div>
  );
}
