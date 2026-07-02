"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { PROJECT_STATUSES, PROJECT_TYPES, SERVICES_CATALOG } from "@/app/lib/constants";
import type { Episode, Project, ProjectServiceItem } from "@/app/lib/types";
import { formatDate } from "./utils";
import EpisodeCard from "@/app/components/episodes/EpisodeCard";
import EpisodeFormModal from "@/app/components/episodes/EpisodeFormModal";
import FilesPanel from "./FilesPanel";
import ClientsTab, { type ProjectClientRow } from "./ClientsTab";
import ActivityTimeline, { type ActivityItem } from "./ActivityTimeline";

type TabKey = "overview" | "episodes" | "clients" | "files" | "activity";

interface Props {
  project: Project;
  clientName: string | null;
  services: ProjectServiceItem[];
  episodes: Episode[];
  stageCounts: Record<string, number>;
  projectClients: ProjectClientRow[];
  activities: ActivityItem[];
  counts: { files: number; notes: number; pendingApprovals: number };
}

export default function ProjectDetailView(props: Props) {
  const { project, clientName, services, episodes, stageCounts, projectClients, activities, counts } = props;
  const router = useRouter();
  const supabase = createClient();
  const { company } = useSession();
  const companyId = company!.id;

  const [tab, setTab] = useState<TabKey>("overview");
  const [status, setStatus] = useState(project.status);
  const [name, setName] = useState(project.name);
  const [editingName, setEditingName] = useState(false);
  const [notes, setNotes] = useState(project.notes ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);

  const avgProgress = episodes.length ? Math.round(episodes.reduce((s, e) => s + Number(e.progress), 0) / episodes.length) : 0;

  const typeLabel =
    project.type === "other" ? project.custom_type || "أخرى" : PROJECT_TYPES.find((t) => t.value === project.type)?.label || project.type || "—";
  const statusInfo = PROJECT_STATUSES.find((s) => s.value === status);

  async function changeStatus(next: string) {
    const prev = status;
    setStatus(next as Project["status"]);
    await supabase.from("projects").update({ status: next }).eq("id", project.id);
    await logActivity(supabase, { companyId, projectId: project.id, action: "project_status_changed", details: { from: prev, to: next } });
    router.refresh();
  }

  async function saveName() {
    setEditingName(false);
    if (name.trim() && name.trim() !== project.name) {
      await supabase.from("projects").update({ name: name.trim() }).eq("id", project.id);
      await logActivity(supabase, { companyId, projectId: project.id, action: "project_updated", details: { field: "name" } });
      router.refresh();
    }
  }

  async function saveNotes() {
    setEditingNotes(false);
    if (notes !== (project.notes ?? "")) {
      await supabase.from("projects").update({ notes: notes || null }).eq("id", project.id);
      router.refresh();
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "نظرة عامة" },
    { key: "episodes", label: `الحلقات (${episodes.length})` },
    { key: "clients", label: "العملاء" },
    { key: "files", label: "الملفات" },
    { key: "activity", label: "النشاط" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Link href="/projects" style={{ fontSize: 13, color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Icon name="arrowRight" size={14} /> كل المشاريع
      </Link>

      {/* Header */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            height: 150,
            background: project.cover_image_url
              ? `center/cover no-repeat url(${project.cover_image_url})`
              : "linear-gradient(135deg, var(--bg-hover), var(--bg-secondary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {!project.cover_image_url && <Icon name="image" size={34} className="text-muted" />}
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <span className="chip chip-gold" style={{ marginBottom: 8 }}>
                {typeLabel}
              </span>
              {editingName ? (
                <input
                  className="input-field"
                  value={name}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  style={{ fontSize: 22, fontWeight: 800, maxWidth: 480 }}
                />
              ) : (
                <h1
                  className="page-title-size"
                  style={{ fontSize: 24, fontWeight: 800, cursor: "text", display: "inline-flex", alignItems: "center", gap: 8 }}
                  onClick={() => setEditingName(true)}
                >
                  {name}
                  <Icon name="edit" size={15} className="text-muted" />
                </h1>
              )}
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="clients" size={13} /> {clientName || "بدون عميل"}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
              <label style={{ fontSize: 11, color: "var(--text-muted)" }}>الحالة</label>
              <select
                className="input-field"
                value={status}
                onChange={(e) => changeStatus(e.target.value)}
                style={{ width: "auto", color: statusInfo?.color, fontWeight: 700 }}
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* progress */}
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: "var(--text-secondary)" }}>نسبة الإنجاز (متوسط الحلقات)</span>
              <span style={{ fontWeight: 700 }}>{avgProgress}%</span>
            </div>
            <div className="progress-bar" style={{ height: 6 }}>
              <div className="progress-fill" style={{ width: `${avgProgress}%` }} />
            </div>
          </div>

          {/* meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginTop: 18 }}>
            <Meta icon="money" label="الميزانية" value={project.budget ? `${Number(project.budget).toLocaleString()} ر.س` : "—"} />
            <Meta icon="calendar" label="تاريخ التصوير" value={formatDate(project.shooting_date)} />
            <Meta icon="calendar" label="تاريخ التسليم" value={formatDate(project.delivery_date)} />
            <Meta icon="location" label="الموقع" value={project.location || "—"} />
            {project.storage_link && (
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="link" size={12} /> رابط التخزين
                </div>
                <a href={project.storage_link} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--gold)" }}>
                  فتح الرابط
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="tabs-scroll" style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="btn-ghost"
            style={{
              padding: "10px 16px",
              borderRadius: 0,
              borderBottom: tab === t.key ? "2px solid var(--gold)" : "2px solid transparent",
              color: tab === t.key ? "var(--gold)" : "var(--text-secondary)",
              fontWeight: tab === t.key ? 700 : 500,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {tab === "overview" && (
          <OverviewTab
            services={services}
            notes={notes}
            editingNotes={editingNotes}
            setNotes={setNotes}
            setEditingNotes={setEditingNotes}
            saveNotes={saveNotes}
            stats={{ episodes: episodes.length, files: counts.files, notes: counts.notes, approvals: counts.pendingApprovals }}
          />
        )}

        {tab === "episodes" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn btn-gold" onClick={() => setShowEpisodeModal(true)}>
                <Icon name="plus" size={16} /> حلقة جديدة
              </button>
            </div>
            {episodes.length === 0 ? (
              <div className="empty-state card">
                <Icon name="video" size={30} className="text-muted" />
                <p style={{ marginTop: 10 }}>لا توجد حلقات بعد</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 14 }}>
                {episodes.map((ep) => (
                  <EpisodeCard key={ep.id} episode={ep} projectId={project.id} stageCount={stageCounts[ep.id]} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "clients" && <ClientsTab projectId={project.id} initialClients={projectClients} onRefresh={() => router.refresh()} />}

        {tab === "files" && <FilesPanel projectId={project.id} episodeId={null} filter="all" emptyText="لا توجد ملفات على مستوى المشروع" onChanged={() => router.refresh()} />}

        {tab === "activity" && <ActivityTimeline items={activities} />}
      </div>

      {showEpisodeModal && (
        <EpisodeFormModal
          projectId={project.id}
          nextNumber={episodes.length + 1}
          nextSortOrder={episodes.length}
          onClose={() => setShowEpisodeModal(false)}
          onCreated={() => router.refresh()}
        />
      )}
    </div>
  );
}

function Meta({ icon, label, value }: { icon: "money" | "calendar" | "location"; label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3, display: "flex", alignItems: "center", gap: 5 }}>
        <Icon name={icon} size={12} /> {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function OverviewTab({
  services,
  notes,
  editingNotes,
  setNotes,
  setEditingNotes,
  saveNotes,
  stats,
}: {
  services: ProjectServiceItem[];
  notes: string;
  editingNotes: boolean;
  setNotes: (v: string) => void;
  setEditingNotes: (v: boolean) => void;
  saveNotes: () => void;
  stats: { episodes: number; files: number; notes: number; approvals: number };
}) {
  const statItems = [
    { label: "الحلقات", value: stats.episodes, icon: "video" as const },
    { label: "الملفات", value: stats.files, icon: "attachment" as const },
    { label: "الملاحظات", value: stats.notes, icon: "message" as const },
    { label: "اعتمادات معلّقة", value: stats.approvals, icon: "shield" as const },
  ];

  // group services by category
  const grouped = SERVICES_CATALOG.map((g) => ({
    ...g,
    picked: services.filter((s) => s.category === g.category),
  })).filter((g) => g.picked.length > 0);
  const uncategorized = services.filter((s) => !SERVICES_CATALOG.some((g) => g.category === s.category));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        {statItems.map((s) => (
          <div key={s.label} className="stat-card">
            <Icon name={s.icon} size={18} className="text-muted" />
            <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>الخدمات</h3>
        {services.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>لم يتم تحديد خدمات لهذا المشروع.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {grouped.map((g) => (
              <div key={g.category}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--gold)", marginBottom: 6 }}>{g.label}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {g.picked.map((s) => (
                    <span key={s.id} className={s.is_custom ? "chip chip-gold" : "chip"}>
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {uncategorized.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {uncategorized.map((s) => (
                  <span key={s.id} className="chip chip-gold">
                    {s.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>ملاحظات المشروع</h3>
          {!editingNotes && (
            <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setEditingNotes(true)}>
              <Icon name="edit" size={13} /> تعديل
            </button>
          )}
        </div>
        {editingNotes ? (
          <div>
            <textarea className="input-field" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ resize: "vertical" }} autoFocus />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button className="btn btn-gold" style={{ padding: "8px 16px", fontSize: 13 }} onClick={saveNotes}>
                حفظ
              </button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 14, color: notes ? "var(--text-primary)" : "var(--text-muted)", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
            {notes || "لا توجد ملاحظات."}
          </p>
        )}
      </div>
    </div>
  );
}
