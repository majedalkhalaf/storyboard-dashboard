import { Slide, SlideTitle, type SectionProps } from "./EasySections";
import { formatDuration } from "@/app/components/projects/utils";
import { EPISODE_STATUSES } from "@/app/lib/constants";
import Icon from "@/app/components/ui/Icon";

export default function EpisodeDetailsSection({ data, theme }: SectionProps) {
  const episodes = data.episodes;

  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="المحتوى">
        تفاصيل كل حلقة
      </SlideTitle>
      {episodes.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد حلقات بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
          {episodes.map((ep) => {
            const meta = EPISODE_STATUSES.find((s) => s.value === ep.status);
            const hasScript = Boolean(ep.script?.trim());
            const hasScenario = Boolean(ep.scenario?.trim());
            const pct = ep.stagesTotal > 0 ? Math.round((ep.stagesCompleted / ep.stagesTotal) * 100) : 0;
            return (
              <div key={ep.id} style={{ background: theme.card, borderRadius: 12, padding: 16, border: `1px solid ${theme.border}` }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>
                    {ep.number != null ? `الحلقة ${ep.number} — ` : ""}
                    {ep.title}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: meta?.color ?? theme.muted, whiteSpace: "nowrap" }}>{meta?.label ?? ep.status}</span>
                </div>
                {ep.description && (
                  <p style={{ fontSize: 12, color: theme.muted, lineHeight: 1.7, marginTop: 6, whiteSpace: "pre-wrap" }}>{ep.description}</p>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.muted }}>
                    <Icon name="clock" size={14} />
                    {formatDuration(ep.duration_seconds)}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.muted }}>
                    <Icon name="tasks" size={14} />
                    المراحل {ep.stagesCompleted}/{ep.stagesTotal} ({pct}%)
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: ep.hasStoryboard ? theme.accent : theme.muted }}>
                    <Icon name="grid" size={14} />
                    {ep.hasStoryboard ? `Storyboard (${ep.storyboardScenesCount} مشهد)` : "بدون Storyboard"}
                  </div>
                  {(hasScript || hasScenario) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.accent }}>
                      <Icon name="attachment" size={14} />
                      {[hasScript && "سكربت", hasScenario && "سيناريو"].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <div style={{ height: 5, borderRadius: 3, background: theme.border, overflow: "hidden", marginTop: 12 }}>
                  <div style={{ height: "100%", width: `${ep.progress}%`, background: theme.accent, borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Slide>
  );
}
