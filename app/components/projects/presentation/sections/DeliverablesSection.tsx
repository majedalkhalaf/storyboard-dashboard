import { Slide, SlideTitle, type SectionProps } from "./EasySections";
import Icon from "@/app/components/ui/Icon";
import { serviceCategoryLabel } from "@/app/lib/presentation-data-server";

export default function DeliverablesSection({ data, theme }: SectionProps) {
  const groups = new Map<string, string[]>();
  for (const s of data.services) {
    if (!groups.has(s.category)) groups.set(s.category, []);
    groups.get(s.category)!.push(s.label);
  }

  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="ما ستحصلون عليه">
        المخرجات النهائية
      </SlideTitle>
      {groups.size === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد خدمات مضافة لهذا المشروع بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 18, overflowY: "auto" }}>
          {Array.from(groups.entries()).map(([category, labels]) => (
            <div key={category}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent, marginBottom: 8 }}>{serviceCategoryLabel(category)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {labels.map((label, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: theme.card,
                      border: `1px solid ${theme.border}`,
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontSize: 13,
                    }}
                  >
                    <Icon name="checkCircle" size={16} className="text-muted" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}
