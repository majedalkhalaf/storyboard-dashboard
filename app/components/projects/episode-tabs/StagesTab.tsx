"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import { createClient } from "@/app/lib/supabase/client";
import { useSession } from "@/app/providers/SessionProvider";
import { logActivity } from "@/app/lib/activity";
import { isInternalAdmin } from "@/app/lib/permissions";
import { STAGE_STATUSES } from "@/app/lib/constants";
import type { EpisodeStage, StageStatus } from "@/app/lib/types";
import type { EpisodeFullDetail } from "@/app/lib/episode-detail";
import { formatDate } from "../utils";

export default function StagesTab({ episode, onChanged }: { episode: EpisodeFullDetail; onChanged: (patch: Partial<EpisodeFullDetail>) => void }) {
  const supabase = createClient();
  const { company, profile } = useSession();
  const companyId = company!.id;
  const canEdit = isInternalAdmin(profile.role) || profile.role === "team_member";
  const [openId, setOpenId] = useState<string | null>(null);

  function patchStage(id: string, patch: Partial<EpisodeStage>) {
    onChanged({ stages: episode.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }

  async function updateStage(stage: EpisodeStage, patch: Partial<EpisodeStage>) {
    patchStage(stage.id, patch);
    await supabase.from("episode_stages").update(patch).eq("id", stage.id);
    if (patch.status) {
      await logActivity(supabase, {
        companyId,
        projectId: episode.project_id,
        episodeId: episode.id,
        action: "episode_stage_updated",
        details: { stage: stage.label, to: STAGE_STATUSES.find((s) => s.value === patch.status)?.label },
      });
    }
  }

  function changeStatus(stage: EpisodeStage, status: StageStatus) {
    const patch: Partial<EpisodeStage> = { status };
    if (status === "in_progress" && !stage.started_at) patch.started_at = new Date().toISOString();
    if (status === "completed") {
      patch.completed_at = new Date().toISOString();
      patch.progress = 100;
    }
    updateStage(stage, patch);
  }

  const completedCount = episode.stages.filter((s) => s.status === "completed").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700 }}>مراحل تنفيذ الحلقة</h3>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {completedCount}/{episode.stages.length} مكتملة
        </span>
      </div>

      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 6 }}>
        {episode.stages.map((stage, i) => {
          const info = STAGE_STATUSES.find((s) => s.value === stage.status);
          return (
            <div key={stage.id} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              {i > 0 && <div style={{ width: 24, height: 2, background: "var(--border)", flexShrink: 0 }} />}
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: info?.color,
                  flexShrink: 0,
                  boxShadow: stage.status === "in_progress" ? `0 0 0 3px ${info?.color}33` : "none",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginRight: 6, whiteSpace: "nowrap" }}>{stage.label}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {episode.stages.map((stage) => {
          const info = STAGE_STATUSES.find((s) => s.value === stage.status);
          const assignee = episode.teamMembers.find((m) => m.id === stage.assigned_to);
          const open = openId === stage.id;
          return (
            <div key={stage.id} className="card" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{stage.label}</div>
                <button className="btn-ghost" style={{ padding: "4px 6px", borderRadius: 6 }} onClick={() => setOpenId(open ? null : stage.id)}>
                  <Icon name={open ? "chevronDown" : "chevronLeft"} size={14} />
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <div className="progress-bar" style={{ height: 5, flex: 1 }}>
                  <div className="progress-fill" style={{ width: `${stage.progress}%`, background: info?.color }} />
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{stage.progress}%</span>
              </div>

              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="user" size={12} /> {assignee?.full_name ?? "غير مسند"}
              </div>

              {open && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>الحالة</label>
                    <select
                      className="input-field"
                      disabled={!canEdit}
                      value={stage.status}
                      onChange={(e) => changeStatus(stage, e.target.value as StageStatus)}
                      style={{ fontSize: 12, color: info?.color }}
                    >
                      {STAGE_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>نسبة الإنجاز</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      disabled={!canEdit}
                      value={stage.progress}
                      onChange={(e) => patchStage(stage.id, { progress: Number(e.target.value) })}
                      onMouseUp={(e) => updateStage(stage, { progress: Number((e.target as HTMLInputElement).value) })}
                      onTouchEnd={(e) => updateStage(stage, { progress: Number((e.target as HTMLInputElement).value) })}
                      style={{ width: "100%" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>المسؤول</label>
                    <select
                      className="input-field"
                      disabled={!canEdit}
                      value={stage.assigned_to ?? ""}
                      onChange={(e) => updateStage(stage, { assigned_to: e.target.value || null })}
                      style={{ fontSize: 12 }}
                    >
                      <option value="">غير مسند</option>
                      {episode.teamMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name || "بدون اسم"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                    <div>
                      <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>بدأت</span>
                      {formatDate(stage.started_at)}
                    </div>
                    <div>
                      <span style={{ color: "var(--text-muted)", display: "block", marginBottom: 2 }}>انتهت</span>
                      {formatDate(stage.completed_at)}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>ملاحظات المرحلة</label>
                    <textarea
                      className="input-field"
                      rows={2}
                      disabled={!canEdit}
                      defaultValue={stage.notes ?? ""}
                      onBlur={(e) => {
                        if (e.target.value !== (stage.notes ?? "")) updateStage(stage, { notes: e.target.value || null });
                      }}
                      style={{ fontSize: 12, resize: "vertical" }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
