import { Slide, SlideTitle, type SectionProps } from "./EasySections";

const EXCERPT_LENGTH = 320;

function excerpt(text: string): { text: string; truncated: boolean } {
  const trimmed = text.trim();
  if (trimmed.length <= EXCERPT_LENGTH) return { text: trimmed, truncated: false };
  return { text: trimmed.slice(0, EXCERPT_LENGTH), truncated: true };
}

export default function ScriptSection({ data, theme }: SectionProps) {
  const episodes = data.episodes.filter((e) => Boolean(e.script?.trim()) || Boolean(e.scenario?.trim()));

  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>السكربت</SlideTitle>
      {episodes.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا يوجد سكربت أو سيناريو مضاف بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          {episodes.map((ep) => {
            const script = ep.script?.trim() ? excerpt(ep.script) : null;
            const scenario = ep.scenario?.trim() ? excerpt(ep.scenario) : null;
            return (
              <div key={ep.id} style={{ background: theme.card, borderRadius: 12, padding: 16, border: `1px solid ${theme.border}` }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: theme.accent, marginBottom: 10 }}>
                  {ep.number != null ? `الحلقة ${ep.number} — ` : ""}
                  {ep.title}
                </div>
                {script && (
                  <div style={{ marginBottom: scenario ? 12 : 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 4 }}>السكربت (مقتطف)</div>
                    <p style={{ fontSize: 12, lineHeight: 1.8, color: theme.text, opacity: 0.9, whiteSpace: "pre-wrap" }}>
                      {script.text}
                      {script.truncated && "…"}
                    </p>
                  </div>
                )}
                {scenario && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 4 }}>السيناريو (مقتطف)</div>
                    <p style={{ fontSize: 12, lineHeight: 1.8, color: theme.text, opacity: 0.9, whiteSpace: "pre-wrap" }}>
                      {scenario.text}
                      {scenario.truncated && "…"}
                    </p>
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
