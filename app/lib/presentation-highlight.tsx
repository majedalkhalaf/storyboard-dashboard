import type { PresentationTheme } from "@/app/lib/presentation-themes";

// نظام تمييز نصّي بسيط ومشترك عبر كل قنوات العرض (المعاينة/المشاركة/الطباعة عبر
// React، وPowerPoint عبر pptxgenjs) — صيغة **كلمة** تُعرَض بارزة (Bold) وبلون
// تمييز الهوية البصرية الفعلي (theme.accent)، بدل تنسيق ثابت لا يعكس هوية كل شركة.
// النصوص المولَّدة تلقائياً (presentation-copywriter.ts) تستخدم هذه الصيغة، وأي
// عضو فريق يمكنه أيضاً كتابتها يدوياً داخل حقول النصوص لتمييز كلمات مهمة بنفسه.

export interface HighlightRun {
  text: string;
  bold: boolean;
}

/** يفكّك نصاً يحتوي **كلمة** إلى تشغيلات (runs) عادية/بارزة متتالية. */
export function parseHighlightRuns(text: string): HighlightRun[] {
  if (!text) return [];
  const runs: HighlightRun[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) runs.push({ text: text.slice(lastIndex, match.index), bold: false });
    runs.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) runs.push({ text: text.slice(lastIndex), bold: false });
  return runs;
}

/** عنصر React يعرض نصاً بصيغة التمييز أعلاه — يُستخدم داخل كل مكوّنات الأقسام
 * (EasySections وغيرها) بدل عرض النص كسلسلة خام مباشرة. */
export function HighlightedText({
  text,
  theme,
  style,
  boldColor,
}: {
  text: string;
  theme: PresentationTheme;
  style?: React.CSSProperties;
  /** لون التمييز البارز — افتراضياً theme.accent؛ يُستبدَل عند عرض النص فوق خلفية
   * بلون theme.accent نفسه (مثل بطاقة "الفرصة" المميّزة) كي لا يختفي النص البارز. */
  boldColor?: string;
}) {
  const runs = parseHighlightRuns(text);
  return (
    <span style={style}>
      {runs.map((r, i) =>
        r.bold ? (
          <strong key={i} style={{ color: boldColor ?? theme.accent, fontWeight: 800 }}>
            {r.text}
          </strong>
        ) : (
          <span key={i}>{r.text}</span>
        )
      )}
    </span>
  );
}

// يبني مصفوفة "تشغيلات نصية" (text runs) بصيغة pptxgenjs — نفس منطق HighlightedText
// لكن كخيارات تنسيق per-run بدل JSX، لاستخدامه مباشرة داخل addText([...]) في
// presentation-pptx.ts.
export function buildPptxHighlightRuns(
  text: string,
  theme: PresentationTheme,
  baseOptions: Record<string, unknown>
): { text: string; options: Record<string, unknown> }[] {
  const runs = parseHighlightRuns(text || "—");
  if (runs.length === 0) return [{ text: "—", options: baseOptions }];
  return runs.map((r) => ({
    text: r.text,
    options: r.bold ? { ...baseOptions, bold: true, color: hexNoHash(theme.accent) } : baseOptions,
  }));
}

function hexNoHash(color: string): string {
  return color.replace("#", "").toUpperCase();
}
