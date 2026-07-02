"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { STAGE_STATUSES } from "@/app/lib/constants";
import type { EpisodeStage, StageStatus } from "@/app/lib/types";

export default function EpisodeStagesPanel({
  projectId,
  episodeId,
  initialStages,
  onProgress,
}: {
  projectId: string;
  episodeId: string;
  initialStages: EpisodeStage[];
  onProgress: () => void;
}) {
  const supabase = createClient();
  const { userId, company } = useSession();
  const companyId = company!.id;
  const [stages, setStages] = useState<EpisodeStage[]>(initialStages);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function persist(stage: EpisodeStage, patch: Partial<EpisodeStage>, logDetails?: Record<string, unknown>) {
    setSavingId(stage.id);
    const merged = { ...stage, ...patch };
    setStages((prev) => prev.map((s) => (s.id === stage.id ? merged : s)));
    await supabase.from("episode_stages").update({ ...patch, updated_by: userId }).eq("id", stage.id);
    if (logDetails) {
      await logActivity(supabase, { companyId, projectId, episodeId, action: "episode_stage_updated", details: { stage: stage.label, ...logDetails } });
    }
    setSavingId(null);
    onProgress();
  }

  function updateStatus(stage: EpisodeStage, status: StageStatus) {
    const patch: Partial<EpisodeStage> = { status };
    if (status === "completed") patch.progress = 100;
    if (status === "in_progress" && !stage.started_at) patch.started_at = new Date().toISOString();
    persist(stage, patch, { from: stage.status, to: status });
  }

  function updateProgress(stage: EpisodeStage, progress: number) {
    const p = Math.max(0, Math.min(100, progress));
    const patch: Partial<EpisodeStage> = { progress: p };
    if (p === 100 && stage.status !== "completed") patch.status = "completed";
    else if (p > 0 && p < 100 && stage.status === "pending") patch.status = "in_progress";
    setStages((prev) => prev.map((s) => (s.id === stage.id ? { ...s, ...patch } : s)));
  }

  function commitProgress(stage: EpisodeStage) {
    persist(stage, { progress: stage.progress, status: stage.status }, { progress: stage.progress });
  }

  function start(stage: EpisodeStage) {
    persist(stage, { status: "in_progress", started_at: stage.started_at ?? new Date().toISOString() }, { from: stage.status, to: "in_progress" });
  }

  function finish(stage: EpisodeStage) {
    persist(stage, { status: "completed", progress: 100, completed_at: new Date().toISOString() }, { from: stage.status, to: "completed" });
  }

  function updateNotes(stage: EpisodeStage, notes: string) {
    setStages((prev) => prev.map((s) => (s.id === stage.id ? { ...s, notes } : s)));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {stages.map((stage) => {
        const status = STAGE_STATUSES.find((s) => s.value === stage.status);
        return (
          <div key={stage.id} className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{stage.label}</span>
                {status && (
                  <span className="chip" style={{ color: status.color, borderColor: status.color }}>
                    {status.label}
                  </span>
                )}
                {savingId === stage.id && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>حفظ...</span>}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {stage.status === "pending" && (
                  <button className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => start(stage)}>
                    <Icon name="clock" size={13} /> بدء
                  </button>
                )}
                {stage.status !== "completed" && stage.status !== "skipped" && (
                  <button className="btn btn-gold" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => finish(stage)}>
                    <Icon name="check" size={13} /> إنهاء
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "180px 140px 1fr", gap: 12, alignItems: "center" }}>
              <select
                className="input-field"
                value={stage.status}
                onChange={(e) => updateStatus(stage, e.target.value as StageStatus)}
                style={{ padding: "6px 10px", fontSize: 13 }}
              >
                {STAGE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                className="input-field"
                value={stage.due_date ?? ""}
                onChange={(e) => persist(stage, { due_date: e.target.value || null })}
                style={{ padding: "6px 10px", fontSize: 13 }}
                title="تاريخ الاستحقاق"
              />

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={stage.progress}
                  onChange={(e) => updateProgress(stage, Number(e.target.value))}
                  onMouseUp={() => commitProgress(stage)}
                  onTouchEnd={() => commitProgress(stage)}
                  style={{ flex: 1, accentColor: "var(--gold)" }}
                />
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={stage.progress}
                  onChange={(e) => updateProgress(stage, Number(e.target.value))}
                  onBlur={() => commitProgress(stage)}
                  className="input-field"
                  style={{ width: 70, padding: "6px 8px", fontSize: 13 }}
                />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>%</span>
              </div>
            </div>

            <textarea
              className="input-field"
              rows={2}
              placeholder="ملاحظات على المرحلة..."
              value={stage.notes ?? ""}
              onChange={(e) => updateNotes(stage, e.target.value)}
              onBlur={() => persist(stage, { notes: stage.notes })}
              style={{ marginTop: 10, resize: "vertical", fontSize: 13 }}
            />
          </div>
        );
      })}
    </div>
  );
}
