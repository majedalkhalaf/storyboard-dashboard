import { Slide, SlideTitle, type SectionProps } from "./EasySections";
import { formatDuration } from "@/app/components/projects/utils";
import { EPISODE_STATUSES } from "@/app/lib/constants";
import type { EpisodeStatus } from "@/app/lib/types";

function statusMeta(status: string) {
  return EPISODE_STATUSES.find((s) => s.value === status) ?? { value: status as EpisodeStatus, label: status, color: "#6B7280" };
}

export default function EpisodesSection({ data, theme }: SectionProps) {
  const episodes = data.episodes;

  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الحلقات</SlideTitle>
      {episodes.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد حلقات بعد.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, overflowY: "auto" }}>
          {episodes.map((ep) => {
            const meta = statusMeta(ep.status);
            return (
              <div key={ep.id} style={{ background: theme.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${theme.border}` }}>
                <div style={{ width: "100%", height: 100, background: theme.bg, position: "relative" }}>
                  {ep.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ep.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted, fontSize: 12 }}>
                      لا توجد صورة غلاف
                    </div>
                  )}
                  {ep.number != null && (
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        insetInlineStart: 8,
                        background: theme.accent,
                        color: "#0A0A0B",
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: 999,
                      }}
                    >
                      #{ep.number}
                    </div>
                  )}
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{ep.title}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                    <span style={{ fontSize: 10, color: theme.muted }}>{formatDuration(ep.duration_seconds)}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: theme.border, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${ep.progress}%`, background: theme.accent, borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Slide>
  );
}
