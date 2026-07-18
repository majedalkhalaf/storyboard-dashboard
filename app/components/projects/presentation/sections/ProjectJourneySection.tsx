import Icon, { type IconName } from "@/app/components/ui/Icon";
import { Slide, SlideTitle, type SectionProps } from "./EasySections";
import { formatDate } from "@/app/components/projects/utils";

// نفس تجميع ألوان الحالة المعتمد في app/lib/episode-gallery.ts (ذهبي=تخطيط، أزرق=تصوير،
// برتقالي=مونتاج، رمادي مائل للأزرق=مراجعة) + أخضر للتسليم النهائي — بلا بنفسجي إطلاقاً.
const STAGE_BUCKET_ICON: Record<string, IconName> = {
  idea: "wand",
  script: "fileCheck",
  scenario: "fileCheck",
  storyboard: "palette",
  shooting: "video",
  audio: "volume",
  editing: "sliders",
  color: "palette",
  review: "eye",
  delivery: "badgeCheck",
};

export default function ProjectJourneySection({ data, theme }: SectionProps) {
  const stages = data.stages;

  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="خارطة الطريق">
        رحلة المشروع
      </SlideTitle>
      {stages.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد مراحل مسجَّلة بعد.</p>
      ) : (
        <div style={{ display: "flex", flex: 1, alignItems: "stretch", overflowX: "auto", gap: 0, paddingBottom: 8 }}>
          {stages.map((s, i) => {
            const isDone = s.episodesTotal > 0 && s.completed === s.episodesTotal;
            const isActive = !isDone && s.inProgress > 0;
            const icon = STAGE_BUCKET_ICON[s.key] ?? "checkCircle";
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "flex-start", flex: 1, minWidth: 150 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, textAlign: "center" }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: isDone ? theme.accent : isActive ? `${theme.accent}18` : theme.card,
                      border: `2px solid ${isDone || isActive ? theme.accent : theme.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: isDone ? "#0A0A0B" : theme.accent,
                      flexShrink: 0,
                      position: "relative",
                    }}
                  >
                    <Icon name={icon} size={18} />
                    <span
                      style={{
                        position: "absolute",
                        top: -6,
                        insetInlineEnd: -6,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: theme.bg,
                        border: `1px solid ${theme.border}`,
                        fontSize: 9.5,
                        fontWeight: 800,
                        color: theme.text,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, marginTop: 12, color: theme.text }}>{s.label}</div>
                  <div style={{ fontSize: 10.5, color: isActive ? theme.accent : theme.muted, marginTop: 4, fontWeight: isActive ? 700 : 400 }}>
                    {isDone ? "مكتمل" : isActive ? "قيد التنفيذ" : "لم يبدأ"} · {s.completed}/{s.episodesTotal}
                  </div>
                  {(s.earliestStart || s.latestEnd) && (
                    <div style={{ fontSize: 9.5, color: theme.muted, marginTop: 5, opacity: 0.8 }}>
                      {s.earliestStart && formatDate(s.earliestStart)}
                      {s.earliestStart && s.latestEnd && " – "}
                      {s.latestEnd && formatDate(s.latestEnd)}
                    </div>
                  )}
                </div>
                {i < stages.length - 1 && <div style={{ height: 1, flex: 0.6, background: theme.border, marginTop: 23, minWidth: 20 }} />}
              </div>
            );
          })}
        </div>
      )}
    </Slide>
  );
}
