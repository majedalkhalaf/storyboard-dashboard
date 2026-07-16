import { buildPptxHighlightRuns } from "@/app/lib/presentation-highlight";
import type { PresentationTheme } from "@/app/lib/presentation-themes";

// أدوات بناء شرائح PowerPoint عامة ومشتركة بين أي ميزة تبني عرضاً تقديمياً في
// هذا التطبيق (العرض الفني presentation-pptx.ts وكتيّب المشروع النهائي
// booklet-pptx.ts) — استُخرجت هنا لتفادي تكرار نفس منطق تنسيق الشرائح (عناوين،
// فقرات، قوائم نقطية، جداول، شعار كل شريحة، سطر تواصل) بين الميزتين.

export type PptxGenJSType = typeof import("pptxgenjs");
export type Pptx = InstanceType<PptxGenJSType["default"]>;
export type PptxSlide = ReturnType<Pptx["addSlide"]>;

export function hex(color: string): string {
  return color.replace("#", "").toUpperCase();
}

// شعار الشركة الحالي المطلوب وضعه كعلامة مائية صغيرة أعلى كل شريحة — متغيّر
// على مستوى الوحدة بدل تمرير logoUrl كمعامل عبر عشرات الدوال؛ كل من
// buildPresentationPptx وbuildBookletPptx يضبطانه عبر setPptxLogo قبل البناء
// ويُصفّرانه بعد الانتهاء (finally)، ولا خطر تداخل لأن كل بناء يحدث دفعة واحدة
// غير متزامنة مع أي بناء آخر (ضغطة زر تنزيل واحدة في كل مرة).
let currentLogoUrl: string | null = null;
export function setPptxLogo(url: string | null) {
  currentLogoUrl = url;
}

export function newSlide(pptx: Pptx, theme: PresentationTheme, opts?: { skipLogo?: boolean }): PptxSlide {
  const slide = pptx.addSlide();
  slide.background = { color: hex(theme.bg) };
  if (currentLogoUrl && !opts?.skipLogo) {
    slide.addImage({ path: currentLogoUrl, x: 8.55, y: 0.22, w: 0.75, h: 0.5, sizing: { type: "contain", w: 0.75, h: 0.5 } });
  }
  return slide;
}

export function addTitle(slide: PptxSlide, theme: PresentationTheme, title: string) {
  slide.addText(title, {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.7,
    fontSize: 26,
    bold: true,
    color: hex(theme.accent),
    fontFace: "Arial",
    align: "right",
    rtlMode: true,
  });
}

export function addParagraph(slide: PptxSlide, theme: PresentationTheme, text: string, y = 1.25) {
  // buildPptxHighlightRuns يترجم صيغة **كلمة** إلى تشغيلات نصية بارزة بلون هوية
  // الشركة (theme.accent) بدل عرض النجمتين كنصّ خام.
  slide.addText(buildPptxHighlightRuns(text || "—", theme, { fontSize: 14, color: hex(theme.text), fontFace: "Arial" }), {
    x: 0.5,
    y,
    w: 9,
    h: 3.9,
    align: "right",
    rtlMode: true,
    valign: "top",
  });
}

export function addBulletList(slide: PptxSlide, theme: PresentationTheme, items: string[], y = 1.25) {
  const safeItems = items.length ? items : ["لا توجد بيانات مضافة بعد"];
  slide.addText(
    safeItems.map((text) => ({ text, options: { bullet: true, breakLine: true, paraSpaceAfter: 8 } })),
    {
      x: 0.5,
      y,
      w: 9,
      h: 4,
      fontSize: 13,
      color: hex(theme.text),
      fontFace: "Arial",
      align: "right",
      rtlMode: true,
      valign: "top",
    }
  );
}

// نسخة من addBulletList تدعم صيغة **كلمة** داخل كل بند.
export function addRichBulletList(slide: PptxSlide, theme: PresentationTheme, items: string[], y = 1.25) {
  const safeItems = items.length ? items : ["لا توجد بيانات مضافة بعد"];
  const runs: { text: string; options: Record<string, unknown> }[] = [];
  for (const item of safeItems) {
    const itemRuns = buildPptxHighlightRuns(item, theme, { fontSize: 13, color: hex(theme.text), fontFace: "Arial" });
    itemRuns.forEach((r, j) => {
      runs.push({
        text: r.text,
        options: {
          ...r.options,
          ...(j === 0 ? { bullet: true } : {}),
          ...(j === itemRuns.length - 1 ? { breakLine: true, paraSpaceAfter: 8 } : {}),
        },
      });
    });
  }
  slide.addText(runs, { x: 0.5, y, w: 9, h: 4, align: "right", rtlMode: true, valign: "top" });
}

export interface ContactInfo {
  companyPhone: string | null;
  companyWhatsapp: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
}

// سطر تواصل حقيقي قابل للنقر (هاتف/واتساب/بريد/موقع) بروابط hyperlink فعلية
// مدعومة أصلاً في pptxgenjs — لا نصّ ثابت غير تفاعلي.
export function buildContactRuns(data: ContactInfo, theme: PresentationTheme): { text: string; options: Record<string, unknown> }[] {
  const items: { label: string; url: string }[] = [];
  if (data.companyPhone) items.push({ label: data.companyPhone, url: `tel:${data.companyPhone}` });
  if (data.companyWhatsapp) items.push({ label: "واتساب", url: `https://wa.me/${data.companyWhatsapp.replace(/\D/g, "")}` });
  if (data.companyEmail) items.push({ label: data.companyEmail, url: `mailto:${data.companyEmail}` });
  if (data.companyWebsite) items.push({ label: data.companyWebsite, url: data.companyWebsite.startsWith("http") ? data.companyWebsite : `https://${data.companyWebsite}` });

  const runs: { text: string; options: Record<string, unknown> }[] = [];
  items.forEach((item, i) => {
    if (i > 0) runs.push({ text: "   |   ", options: { color: hex(theme.muted), fontSize: 11 } });
    runs.push({ text: item.label, options: { color: hex(theme.accent), fontSize: 11, hyperlink: { url: item.url } } });
  });
  return runs;
}

export function addContactLine(slide: PptxSlide, theme: PresentationTheme, data: ContactInfo, y: number) {
  const runs = buildContactRuns(data, theme);
  if (runs.length === 0) return;
  slide.addText(runs, { x: 0.5, y, w: 9, h: 0.4, align: "center", rtlMode: true });
}

export function addTable(slide: PptxSlide, theme: PresentationTheme, header: string[], rows: string[][], y = 1.25) {
  const headRow = header.map((label) => ({
    text: label,
    options: { bold: true, color: "FFFFFF", fill: { color: hex(theme.accent) }, align: "right" as const, fontSize: 11 },
  }));
  const bodyRows = rows.length
    ? rows.map((r) =>
        r.map((cell) => ({
          text: cell || "—",
          options: { color: hex(theme.text), fill: { color: hex(theme.card) }, align: "right" as const, fontSize: 11 },
        }))
      )
    : [header.map(() => ({ text: "لا توجد بيانات", options: { color: hex(theme.muted), fill: { color: hex(theme.card) }, align: "right" as const, fontSize: 11 } }))];

  slide.addTable([headRow, ...bodyRows], {
    x: 0.5,
    y,
    w: 9,
    color: hex(theme.text),
    border: { type: "solid", color: theme.border.startsWith("rgba") ? "333333" : hex(theme.border), pt: 0.5 },
    autoPage: true,
  });
}
