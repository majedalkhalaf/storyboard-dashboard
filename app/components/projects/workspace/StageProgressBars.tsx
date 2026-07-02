import type { StageProgress } from "@/app/lib/workspace-projects";

const STAGES: { key: keyof StageProgress; label: string }[] = [
  { key: "planning", label: "التخطيط" },
  { key: "shooting", label: "التصوير" },
  { key: "editing", label: "المونتاج" },
  { key: "review", label: "المراجعة" },
  { key: "delivery", label: "التسليم" },
];

export default function StageProgressBars({ stageProgress }: { stageProgress: StageProgress }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {STAGES.map((s) => (
        <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10.5, color: "var(--text-muted)", width: 52, flexShrink: 0 }}>{s.label}</span>
          <div className="progress-bar" style={{ flex: 1, height: 3 }}>
            <div className="progress-fill" style={{ width: `${stageProgress[s.key]}%` }} />
          </div>
          <span style={{ fontSize: 10.5, color: "var(--text-muted)", width: 28, textAlign: "left", flexShrink: 0 }}>
            {stageProgress[s.key]}%
          </span>
        </div>
      ))}
    </div>
  );
}
