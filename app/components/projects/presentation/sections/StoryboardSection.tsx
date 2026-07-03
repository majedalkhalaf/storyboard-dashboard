import { Slide, SlideTitle, type SectionProps } from "./EasySections";
import Icon from "@/app/components/ui/Icon";

export default function StoryboardSection({ data, theme }: SectionProps) {
  const scenes = data.storyboardScenes;

  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>Storyboard</SlideTitle>
      {scenes.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد مشاهد Storyboard بعد.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, overflowY: "auto" }}>
          {scenes.map((sc) => (
            <div key={sc.id} style={{ background: theme.card, borderRadius: 12, overflow: "hidden", border: `1px solid ${theme.border}` }}>
              <div style={{ width: "100%", height: 90, background: theme.bg, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {sc.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sc.cover_image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <Icon name="grid" size={22} className="text-muted" />
                )}
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    insetInlineStart: 6,
                    background: theme.accent,
                    color: "#0A0A0B",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: 999,
                  }}
                >
                  {sc.number != null ? `#${sc.number}` : "—"}
                </div>
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.title}</div>
                <div style={{ fontSize: 10, color: theme.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sc.episodeTitle}</div>
                {sc.shot_type && <div style={{ fontSize: 10, color: theme.accent, marginTop: 4 }}>{sc.shot_type}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}
