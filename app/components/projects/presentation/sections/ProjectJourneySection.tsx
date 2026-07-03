import { Slide, SlideTitle, type SectionProps } from "./EasySections";
import { formatDate } from "@/app/components/projects/utils";

// نفس تجميع ألوان الحالة المعتمد في app/lib/episode-gallery.ts (ذهبي=تخطيط، أزرق=تصوير،
// برتقالي=مونتاج، رمادي مائل للأزرق=مراجعة) + أخضر للتسليم النهائي — بلا بنفسجي إطلاقاً.
const STAGE_BUCKET_COLOR: Record<string, string> = {
  idea: "#CE902F",
  script: "#CE902F",
  scenario: "#CE902F",
  storyboard: "#CE902F",
  shooting: "#3B82F6",
  audio: "#3B82F6",
  editing: "#F59E0B",
  color: "#F59E0B",
  review: "#64748B",
  delivery: "#1DB954",
};

export default function ProjectJourneySection({ data, theme }: SectionProps) {
  const stages = data.stages;

  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>رحلة المشروع</SlideTitle>
      {stages.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد مراحل مسجَّلة بعد.</p>
      ) : (
        <div style={{ display: "flex", flex: 1, alignItems: "stretch", overflowX: "auto", gap: 0, paddingBottom: 8 }}>
          {stages.map((s, i) => {
            const color = STAGE_BUCKET_COLOR[s.key] ?? theme.accent;
            const isDone = s.episodesTotal > 0 && s.completed === s.episodesTotal;
            const isActive = !isDone && s.inProgress > 0;
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 150 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: isDone ? color : "transparent",
                      border: `2px solid ${color}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isDone ? "#0A0A0B" : color,
                      fontWeight: 800,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10, color: theme.text }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: isActive ? color : theme.muted, marginTop: 4 }}>
                    {isDone ? "مكتمل" : isActive ? "قيد التنفيذ" : "لم يبدأ"} · {s.completed}/{s.episodesTotal}
                  </div>
                  {(s.earliestStart || s.latestEnd) && (
                    <div style={{ fontSize: 10, color: theme.muted, marginTop: 6, opacity: 0.8 }}>
                      {s.earliestStart && formatDate(s.earliestStart)}
                      {s.earliestStart && s.latestEnd && " – "}
                      {s.latestEnd && formatDate(s.latestEnd)}
                    </div>
                  )}
                </div>
                {i < stages.length - 1 && (
                  <div style={{ height: 2, flex: 0.6, background: theme.border, marginTop: -46, minWidth: 20 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </Slide>
  );
}
