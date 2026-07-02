"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { EPISODE_STATUSES } from "@/app/lib/constants";
import type { Episode, EpisodeStage, EpisodeStatus } from "@/app/lib/types";
import FilesPanel from "@/app/components/projects/FilesPanel";
import NotesThread from "./NotesThread";
import ApprovalPanel, { type ApprovalRow } from "./ApprovalPanel";
import EpisodeStagesPanel from "./EpisodeStagesPanel";
import ActivityTimeline, { type ActivityItem } from "@/app/components/projects/ActivityTimeline";

type TabKey = "overview" | "script" | "scenario" | "storyboard" | "files" | "videos" | "images" | "notes" | "approval" | "stages" | "activity";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "نظرة عامة" },
  { key: "script", label: "السكربت" },
  { key: "scenario", label: "السيناريو" },
  { key: "storyboard", label: "Storyboard" },
  { key: "files", label: "الملفات" },
  { key: "videos", label: "الفيديوهات" },
  { key: "images", label: "الصور" },
  { key: "notes", label: "الملاحظات" },
  { key: "approval", label: "الاعتماد" },
  { key: "stages", label: "المراحل" },
  { key: "activity", label: "النشاط" },
];

export default function EpisodeDetailView({
  projectId,
  episode,
  stages,
  approvals,
  activities,
}: {
  projectId: string;
  episode: Episode;
  stages: EpisodeStage[];
  approvals: ApprovalRow[];
  activities: ActivityItem[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const { company } = useSession();
  const companyId = company!.id;

  const [tab, setTab] = useState<TabKey>("overview");
  const [status, setStatus] = useState(episode.status);
  const [title, setTitle] = useState(episode.title);
  const [script, setScript] = useState(episode.script ?? "");
  const [scenario, setScenario] = useState(episode.scenario ?? "");
  const [progress, setProgress] = useState(episode.progress);
  const [savingField, setSavingField] = useState<string | null>(null);

  const statusInfo = EPISODE_STATUSES.find((s) => s.value === status);

  async function changeStatus(next: string) {
    const prev = status;
    setStatus(next as EpisodeStatus);
    await supabase.from("episodes").update({ status: next }).eq("id", episode.id);
    await logActivity(supabase, { companyId, projectId, episodeId: episode.id, action: "episode_status_changed", details: { from: prev, to: next } });
  }

  async function saveField(field: "title" | "script" | "scenario", value: string) {
    setSavingField(field);
    await supabase.from("episodes").update({ [field]: value }).eq("id", episode.id);
    setSavingField(null);
  }

  function refreshProgress() {
    router.refresh();
    supabase
      .from("episodes")
      .select("progress")
      .eq("id", episode.id)
      .single()
      .then(({ data }) => data && setProgress(data.progress));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Link href={`/projects/${projectId}`} className="btn btn-ghost" style={{ alignSelf: "flex-start" }}>
          <Icon name="arrowRight" size={16} /> رجوع للمشروع
        </Link>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <input
            className="input-field"
            style={{ fontSize: 20, fontWeight: 800, maxWidth: 420, border: "none", background: "transparent", padding: "4px 0" }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => saveField("title", title)}
          />
          <select className="input-field" style={{ width: "auto", color: statusInfo?.color }} value={status} onChange={(e) => changeStatus(e.target.value)}>
            {EPISODE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{progress}% مكتمل {savingField && "· جارٍ الحفظ..."}</div>
      </div>

      <div className="tabs-scroll" style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--border)", paddingBottom: 2 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`sidebar-link${tab === t.key ? " active" : ""}`}
            style={{ width: "auto", whiteSpace: "nowrap" }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="card" style={{ padding: 20 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>{episode.description || "لا يوجد وصف"}</p>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>النوع: {episode.type || "—"} · رقم الحلقة: {episode.number ?? "—"}</div>
        </div>
      )}

      {tab === "script" && (
        <textarea
          className="input-field"
          rows={20}
          value={script}
          onChange={(e) => setScript(e.target.value)}
          onBlur={() => saveField("script", script)}
          placeholder="اكتب السكربت هنا..."
        />
      )}

      {tab === "scenario" && (
        <textarea
          className="input-field"
          rows={20}
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          onBlur={() => saveField("scenario", scenario)}
          placeholder="اكتب السيناريو هنا..."
        />
      )}

      {tab === "storyboard" && (
        <FilesPanel projectId={projectId} episodeId={episode.id} filter={["image"]} accept="image/*" forceCategory="image" emptyText="لا توجد لقطات Storyboard بعد" />
      )}

      {tab === "files" && <FilesPanel projectId={projectId} episodeId={episode.id} filter="all" />}

      {tab === "videos" && <FilesPanel projectId={projectId} episodeId={episode.id} filter={["video"]} accept="video/*" forceCategory="video" />}

      {tab === "images" && <FilesPanel projectId={projectId} episodeId={episode.id} filter={["image"]} accept="image/*" forceCategory="image" />}

      {tab === "notes" && <NotesThread projectId={projectId} episodeId={episode.id} />}

      {tab === "approval" && <ApprovalPanel projectId={projectId} episodeId={episode.id} episodeStatus={status} approvals={approvals} />}

      {tab === "stages" && (
        <EpisodeStagesPanel projectId={projectId} episodeId={episode.id} initialStages={stages} onProgress={refreshProgress} />
      )}

      {tab === "activity" && <ActivityTimeline items={activities} />}
    </div>
  );
}
