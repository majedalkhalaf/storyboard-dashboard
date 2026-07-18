import { Slide, SlideTitle, type SectionProps } from "./EasySections";
import { formatDuration } from "@/app/components/projects/utils";
import { EPISODE_STATUSES } from "@/app/lib/constants";
import type { EpisodeStatus } from "@/app/lib/types";

function statusMeta(status: string) {
  return EPISODE_STATUSES.find((s) => s.value === status) ?? { value: status as EpisodeStatus, label: status, color: "#6B7280" };
}

// بطاقات الحلقات — الصورة والعنوان هما أول ما يراه العميل هنا، لذا الصورة
// أكبر وأوضح (ارتفاع أكبر + تدرّج غامق أسفلها) والعنوان مكتوب فوقها مباشرة
// بخط أبيض بارز بدل عزله في شريط سفلي منفصل.
export default function EpisodesSection({ data, theme }: SectionProps) {
  const episodes = data.episodes;
  const columns = episodes.length <= 4 ? Math.min(episodes.length, 2) : 3;

  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="المحتوى">
        الحلقات
      </SlideTitle>
      {episodes.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد حلقات بعد.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 14, overflowY: "auto" }}>
          {episodes.map((ep) => {
            const meta = statusMeta(ep.status);
            return (
              <a
                key={ep.id}
                href={`/client/projects/${data.projectId}/episodes/${ep.id}`}
                target="_blank"
                rel="noreferrer"
                style={{ background: theme.card, borderRadius: 14, overflow: "hidden", border: `1px solid ${theme.border}`, textDecoration: "none", color: "inherit", display: "block" }}
              >
                <div style={{ width: "100%", height: 140, background: theme.bg, position: "relative" }}>
                  {ep.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ep.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted, fontSize: 11 }}>
                      لا توجد صورة غلاف
                    </div>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.82) 100%)",
                    }}
                  />
                  {ep.number != null && (
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        insetInlineStart: 10,
                        background: theme.accent,
                        color: "#0A0A0B",
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "2px 9px",
                        borderRadius: 999,
                      }}
                    >
                      #{ep.number}
                    </div>
                  )}
                  <div style={{ position: "absolute", bottom: 10, insetInlineStart: 12, insetInlineEnd: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1.3 }}>{ep.title}</div>
                  </div>
                </div>
                <div style={{ padding: "10px 14px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                    <span style={{ fontSize: 10.5, color: theme.muted }}>{formatDuration(ep.duration_seconds)}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: theme.border, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${ep.progress}%`, background: theme.accent, borderRadius: 3 }} />
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </Slide>
  );
}
