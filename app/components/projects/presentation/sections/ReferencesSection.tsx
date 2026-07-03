import { Slide, SlideTitle, type SectionProps } from "./EasySections";
import Icon from "@/app/components/ui/Icon";

export default function ReferencesSection({ data, theme }: SectionProps) {
  const links = data.referenceLinks;

  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>المراجع</SlideTitle>
      {links.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد مراجع مضافة بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {links.map((link) => (
            <div
              key={link.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: "12px 16px",
              }}
            >
              <Icon name="link" size={16} className="text-muted" />
              <span style={{ fontSize: 13, flex: 1 }}>{link.name}</span>
              <span style={{ fontSize: 11, color: theme.accent, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{link.url}</span>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}
