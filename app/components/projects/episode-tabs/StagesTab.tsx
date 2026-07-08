"use client";

// بطلب صريح: استُبدلت شبكة البطاقات القابلة للطي (تحتاج فتح كل مرحلة على حدة
// لرؤية/تعديل حالتها) بجدول واحد مضغوط — كل عناصر التحكم (الحالة، نسبة الإنجاز،
// الملاحظة) ظاهرة ومباشرة التعديل بلا أي نقرة إضافية للفتح. حقل "المسؤول" أُزيل
// بالكامل (لا داعي له بحسب الطلب).

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

      <div className="card table-scroll" style={{ padding: 0, overflow: "hidden" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>المرحلة</th>
              <th>الحالة</th>
              <th style={{ minWidth: 160 }}>نسبة الإنجاز</th>
              <th>بدأت</th>
              <th>انتهت</th>
              <th style={{ minWidth: 160 }}>ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            {episode.stages.map((stage) => {
              const info = STAGE_STATUSES.find((s) => s.value === stage.status);
              return (
                <tr key={stage.id}>
                  <td style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}>{stage.label}</td>
                  <td>
                    <select
                      className="input-field"
                      disabled={!canEdit}
                      value={stage.status}
                      onChange={(e) => changeStatus(stage, e.target.value as StageStatus)}
                      style={{ fontSize: 12, padding: "6px 8px", color: info?.color, width: "auto" }}
                    >
                      {STAGE_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        disabled={!canEdit}
                        value={stage.progress}
                        onChange={(e) => patchStage(stage.id, { progress: Number(e.target.value) })}
                        onMouseUp={(e) => updateStage(stage, { progress: Number((e.target as HTMLInputElement).value) })}
                        onTouchEnd={(e) => updateStage(stage, { progress: Number((e.target as HTMLInputElement).value) })}
                        style={{ width: 90 }}
                      />
                      <span style={{ fontSize: 11.5, color: "var(--text-muted)", flexShrink: 0, minWidth: 30 }}>{stage.progress}%</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(stage.started_at)}</td>
                  <td style={{ fontSize: 11.5, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{formatDate(stage.completed_at)}</td>
                  <td>
                    <input
                      className="input-field"
                      disabled={!canEdit}
                      defaultValue={stage.notes ?? ""}
                      placeholder="—"
                      onBlur={(e) => {
                        if (e.target.value !== (stage.notes ?? "")) updateStage(stage, { notes: e.target.value || null });
                      }}
                      style={{ fontSize: 12, padding: "6px 8px" }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
