"use client";

import { useState } from "react";
import Icon from "@/app/components/ui/Icon";
import StatusChip from "@/app/components/client/StatusChip";
import { formatDate } from "@/app/components/client/utils";
import { STAGE_STATUSES, STORYBOARD_SCENE_STATUSES } from "@/app/lib/constants";
import type { EpisodeStage, StoryboardScene } from "@/app/lib/types";

// معلومات تشغيلية داخلية (مراحل التنفيذ التفصيلية، السكربت، السيناريو،
// Storyboard) تهم فريق الإنتاج أكثر من العميل — تبقى موجودة في النظام ومتاحة
// لكن خلف صلاحية خاصة فقط، وخلف قسم واحد قابل للطي (مطوي افتراضياً) بدل
// تبويبات بارزة في الصفحة الرئيسية.
export default function EpisodeAdvancedDetails({
  showStages,
  stages,
  stageAssigneeNames,
  showScript,
  script,
  showScenario,
  scenario,
  showStoryboard,
  storyboardScenes,
}: {
  showStages: boolean;
  stages: EpisodeStage[];
  stageAssigneeNames: Record<string, string>;
  showScript: boolean;
  script: string | null;
  showScenario: boolean;
  scenario: string | null;
  showStoryboard: boolean;
  storyboardScenes: StoryboardScene[];
}) {
  const [open, setOpen] = useState(false);

  if (!showStages && !showScript && !showScenario && !showStoryboard) return null;

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 700,
          color: "var(--text-primary)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="sliders" size={16} className="text-muted" /> تفاصيل إضافية
        </span>
        <Icon name="chevronDown" size={16} className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 20 }}>
          {showStages && stages.length > 0 && (
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>مراحل التنفيذ</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stages.map((s) => {
                  const meta = STAGE_STATUSES.find((x) => x.value === s.status) ?? STAGE_STATUSES[0];
                  return (
                    <div key={s.id} style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{s.label}</span>
                        <StatusChip label={meta.label} color={meta.color} />
                      </div>
                      <div className="progress-bar" style={{ marginBottom: 8 }}>
                        <div className="progress-fill" style={{ width: `${s.progress ?? 0}%`, background: meta.color }} />
                      </div>
                      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: "var(--text-muted)" }}>
                        {s.assigned_to && stageAssigneeNames[s.assigned_to] && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon name="user" size={12} /> {stageAssigneeNames[s.assigned_to]}
                          </span>
                        )}
                        {s.started_at && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon name="calendar" size={12} /> بدأت {formatDate(s.started_at)}
                          </span>
                        )}
                        {s.completed_at && (
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Icon name="checkCircle" size={12} /> انتهت {formatDate(s.completed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showScript && (
            <TextBlock title="السكربت" text={script} />
          )}
          {showScenario && (
            <TextBlock title="السيناريو" text={scenario} />
          )}

          {showStoryboard && storyboardScenes.length > 0 && (
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>Storyboard</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                {storyboardScenes.map((scene) => {
                  const meta = STORYBOARD_SCENE_STATUSES.find((s) => s.value === scene.status) ?? STORYBOARD_SCENE_STATUSES[0];
                  return (
                    <div key={scene.id} className="shot-card" style={{ overflow: "hidden" }}>
                      <div style={{ position: "relative", aspectRatio: "16 / 9", overflow: "hidden", background: "var(--bg-hover)", display: "flex", justifyContent: "center", alignItems: "center" }}>
                        {scene.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={scene.cover_image_url} alt={scene.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <Icon name="image" size={22} className="text-muted" />
                        )}
                      </div>
                      <div style={{ padding: 10 }}>
                        <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginBottom: 2 }}>{scene.number != null ? `مشهد ${scene.number}` : "مشهد"}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>{scene.title}</div>
                        <StatusChip label={meta.label} color={meta.color} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string | null }) {
  return (
    <div>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10 }}>{title}</h3>
      <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, fontSize: 13.5, background: "var(--bg-secondary)", borderRadius: 10, padding: 14 }}>
        {text || "لا يوجد محتوى بعد."}
      </p>
    </div>
  );
}
