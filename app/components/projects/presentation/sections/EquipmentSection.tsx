import { Slide, SlideTitle, type SectionProps } from "./EasySections";
import Icon from "@/app/components/ui/Icon";

export default function EquipmentSection({ data, theme }: SectionProps) {
  const equipment = data.equipmentNames;

  return (
    <Slide theme={theme}>
      <SlideTitle theme={theme}>المعدات</SlideTitle>
      {equipment.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد معدات مسجَّلة بعد.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignContent: "flex-start" }}>
          {equipment.map((name) => (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: 999,
                padding: "10px 16px",
                fontSize: 13,
              }}
            >
              <Icon name="equipment" size={16} className="text-muted" />
              {name}
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}
