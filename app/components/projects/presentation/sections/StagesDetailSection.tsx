import { Slide, SlideTitle, type SectionProps } from "./EasySections";

const STATUS_COLOR: Record<string, string> = {
  completed: "#1DB954",
  in_progress: "#F59E0B",
  pending: "#6B7280",
  skipped: "#94A3B8",
};

export default function StagesDetailSection({ data, theme }: SectionProps) {
  const episodes = data.episodes.filter((e) => e.stagesTotal > 0);

  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>مراحل التنفيذ التفصيلية</SlideTitle>
      {episodes.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد مراحل مسجَّلة بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          {episodes.map((ep) => {
            const detailedStages = data.stagesByEpisode[ep.id];
            const pct = ep.stagesTotal > 0 ? Math.round((ep.stagesCompleted / ep.stagesTotal) * 100) : 0;
            return (
              <div key={ep.id} style={{ background: theme.card, borderRadius: 12, padding: 16, border: `1px solid ${theme.border}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {ep.number != null ? `#${ep.number} · ` : ""}
                    {ep.title}
                  </div>
                  <div style={{ fontSize: 12, color: theme.accent, fontWeight: 700 }}>
                    {ep.stagesCompleted}/{ep.stagesTotal} · {pct}%
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: theme.border, overflow: "hidden", marginBottom: detailedStages ? 12 : 0 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: theme.accent, borderRadius: 3 }} />
                </div>
                {detailedStages && detailedStages.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {detailedStages.map((s) => (
                      <div
                        key={s.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11,
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: `1px solid ${theme.border}`,
                          color: theme.text,
                          opacity: 0.9,
                        }}
                      >
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLOR[s.status] ?? theme.muted, flexShrink: 0 }} />
                        {s.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Slide>
  );
}
