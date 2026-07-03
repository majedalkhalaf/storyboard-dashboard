import type { CompanyPipelineStage } from "@/app/lib/types";

export default function ProjectStageTimeline({ stages, currentStageKey }: { stages: CompanyPipelineStage[]; currentStageKey: string | null }) {
  if (stages.length === 0) return null;
  const currentIndex = stages.findIndex((s) => s.key === currentStageKey);

  return (
    <div style={{ display: "flex", overflowX: "auto", gap: 4, paddingBottom: 4 }}>
      {stages.map((s, i) => {
        const done = currentIndex >= 0 && i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 120 }}>
            <div
              className="card"
              style={{
                flex: 1,
                padding: "12px 10px",
                textAlign: "center",
                borderColor: active ? "var(--gold)" : done ? "var(--success)" : "var(--border)",
                background: active ? "rgba(var(--gold-rgb),0.1)" : "var(--bg-card)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: active ? "var(--gold)" : done ? "var(--success)" : "var(--text-secondary)" }}>{s.label}</div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4 }}>{done ? "مكتملة" : active ? "قيد التنفيذ" : "لم تبدأ"}</div>
            </div>
            {i < stages.length - 1 && <div style={{ width: 14, height: 2, background: done ? "var(--success)" : "var(--border)", flexShrink: 0 }} />}
          </div>
        );
      })}
    </div>
  );
}
