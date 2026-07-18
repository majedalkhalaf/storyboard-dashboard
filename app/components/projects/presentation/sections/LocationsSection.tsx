import { Slide, SlideTitle, type SectionProps } from "./EasySections";
import Icon from "@/app/components/ui/Icon";

export default function LocationsSection({ data, theme }: SectionProps) {
  const locations = data.locations;

  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="أين نصوّر">
        المواقع
      </SlideTitle>
      {locations.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد مواقع مسجَّلة بعد.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {locations.map((loc) => (
            <div
              key={loc}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: theme.accent,
                  color: "#0A0A0B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icon name="location" size={16} />
              </div>
              <span style={{ fontSize: 13 }}>{loc}</span>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}
