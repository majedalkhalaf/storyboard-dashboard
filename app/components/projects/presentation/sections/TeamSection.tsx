import { Slide, SlideTitle, type SectionProps } from "./EasySections";

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

export default function TeamSection({ data, theme }: SectionProps) {
  const team = data.team;

  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>الفريق</SlideTitle>
      {team.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا يوجد أعضاء فريق مسندون بعد.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
          {team.map((member) => (
            <div key={member.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
              {member.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={member.avatar_url} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: `2px solid ${theme.border}` }} />
              ) : (
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: theme.accent,
                    color: "#0A0A0B",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 800,
                  }}
                >
                  {initials(member.full_name)}
                </div>
              )}
              <div style={{ fontSize: 13, fontWeight: 700 }}>{member.full_name ?? "بدون اسم"}</div>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}
