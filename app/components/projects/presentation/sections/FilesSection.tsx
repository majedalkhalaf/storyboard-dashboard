import { Slide, SlideTitle, type SectionProps } from "./EasySections";
import Icon from "@/app/components/ui/Icon";
import { FILE_CATEGORY_ICON } from "@/app/components/projects/utils";
import { FILE_CATEGORY_KEYS } from "@/app/lib/presentation-sections";
import type { FileCategory } from "@/app/lib/types";

// نفس تسميات التصنيفات المعتمدة في app/components/projects/FilesPanel.tsx (FILE_CATEGORY_LABEL)
// — مُكرَّرة هنا محلياً لإبقاء هذا القسم عرضياً بحتاً بلا ارتباط بمكوّن "use client" ضخم غير ذي صلة.
const FILE_CATEGORY_LABEL: Record<FileCategory, string> = {
  image: "صورة",
  video: "فيديو",
  document: "مستند",
  audio: "صوت",
  archive: "أرشيف",
  design: "تصميم",
  project_file: "ملف مشروع",
  link: "رابط",
  other: "أخرى",
};

export default function FilesSection({ data, theme }: SectionProps) {
  const tiles = FILE_CATEGORY_KEYS.map((cat) => ({ cat, count: data.fileCounts[cat] })).filter((t) => t.count > 0);

  return (
    <Slide theme={theme} data={data}>
      <SlideTitle theme={theme} eyebrow="التسليمات">
        الملفات والمرفقات
      </SlideTitle>
      {tiles.length === 0 ? (
        <p style={{ fontSize: 13, color: theme.muted }}>لا توجد ملفات مرفوعة بعد.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {tiles.map((t) => (
            <div
              key={t.cat}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                background: theme.card,
                border: `1px solid ${theme.border}`,
                borderRadius: 12,
                padding: 20,
                textAlign: "center",
              }}
            >
              <Icon name={FILE_CATEGORY_ICON[t.cat]} size={24} className="text-muted" />
              <div style={{ fontSize: 20, fontWeight: 800, color: theme.accent }}>{t.count}</div>
              <div style={{ fontSize: 12, color: theme.muted }}>{FILE_CATEGORY_LABEL[t.cat]}</div>
            </div>
          ))}
        </div>
      )}
    </Slide>
  );
}
