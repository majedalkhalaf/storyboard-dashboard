import Icon from "@/app/components/ui/Icon";
import type { CompanyPipelineStage } from "@/app/lib/types";

// stageProgress اختياري: نسبة إنجاز حقيقية لكل مرحلة (متوسط progress من
// episode_stages لكل الحلقات على هذه المرحلة تحديداً) — إن تم تمريره تُعرض
// النسبة الفعلية بدل نص "مكتملة/قيد التنفيذ/لم تبدأ" الثنائي فقط.
export default function ProjectStageTimeline({
  stages,
  currentStageKey,
  stageProgress,
}: {
  stages: CompanyPipelineStage[];
  currentStageKey: string | null;
  stageProgress?: Record<string, number>;
}) {
  if (stages.length === 0) return null;
  const currentIndex = stages.findIndex((s) => s.key === currentStageKey);

  return (
    <div style={{ display: "flex", overflowX: "auto", gap: 4, paddingBottom: 4 }}>
      {stages.map((s, i) => {
        const done = currentIndex >= 0 && i < currentIndex;
        const active = i === currentIndex;
        const pct = stageProgress ? Math.round(stageProgress[s.key] ?? 0) : null;
        const color = active ? "var(--gold)" : done ? "var(--success)" : "var(--text-secondary)";
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 130 }}>
            <div
              className="card card-hover-lift"
              style={{
                flex: 1,
                padding: "14px 10px",
                textAlign: "center",
                borderColor: active ? "var(--gold)" : done ? "var(--success)" : "var(--border)",
                background: active ? "rgba(var(--gold-rgb),0.1)" : done ? "rgba(29,185,84,0.06)" : "var(--bg-card)",
              }}
            >
              {done && (
                <span style={{ color: "var(--success)", display: "block", marginBottom: 4 }}>
                  <Icon name="checkCircle" size={14} />
                </span>
              )}
              <div style={{ fontSize: 12, fontWeight: 700, color }}>{s.label}</div>
              {pct !== null ? (
                <>
                  <div style={{ fontSize: 16, fontWeight: 800, color, marginTop: 6 }}>{pct}%</div>
                  <div className="progress-bar" style={{ height: 4, marginTop: 6 }}>
                    <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4 }}>{done ? "مكتملة" : active ? "قيد التنفيذ" : "لم تبدأ"}</div>
              )}
            </div>
            {i < stages.length - 1 && <div style={{ width: 14, height: 2, background: done ? "var(--success)" : "var(--border)", flexShrink: 0 }} />}
          </div>
        );
      })}
    </div>
  );
}
