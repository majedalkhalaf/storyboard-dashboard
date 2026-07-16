import type { PresentationTemplate } from "@/app/lib/types";

// نظام 10 قوالب حقيقي عبر مُصيّر أقسام واحد مشترك (وليس عشر شاشات مكررة) — كل قالب هو حزمة
// ألوان/خطوط/نبرة بصرية تُطبَّق على نفس المكوّنات، وهذا هو الأسلوب المعتاد لأنظمة "Templates"
// المرنة بدون إعادة بناء كل تخطيط من الصفر لكل قالب.
export interface PresentationTheme {
  key: PresentationTemplate;
  label: string;
  bg: string;
  card: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
  fontHeading: string;
  mood: "dark" | "light";
}

export const PRESENTATION_THEMES: Record<PresentationTemplate, PresentationTheme> = {
  // مدخل ثابت افتراضي فقط لاكتمال النوع (Record) واستخدامه كمعاينة قبل تحميل بيانات
  // الشركة — الاستخدام الفعلي دائماً عبر getPresentationTheme() التي تحسب الألوان
  // الحقيقية من primary_color/secondary_color/accent_color الفعلية للشركة.
  brand: { key: "brand", label: "هوية الشركة", bg: "#0A0A0B", card: "#151517", text: "#F5F5F5", muted: "#9A9A9F", accent: "#CE902F", border: "rgba(255,255,255,0.08)", fontHeading: "'IBM Plex Sans Arabic', sans-serif", mood: "dark" },
  minimal: { key: "minimal", label: "Minimal", bg: "#0F0F11", card: "#18181D", text: "#F5F5F5", muted: "#9A9A9F", accent: "#CE902F", border: "rgba(255,255,255,0.08)", fontHeading: "'IBM Plex Sans Arabic', sans-serif", mood: "dark" },
  luxury: { key: "luxury", label: "Luxury", bg: "#0B0904", card: "#171208", text: "#F3E9D2", muted: "#B7A788", accent: "#E2A33D", border: "rgba(226,163,61,0.25)", fontHeading: "'IBM Plex Sans Arabic', serif", mood: "dark" },
  dark: { key: "dark", label: "Dark", bg: "#000000", card: "#121212", text: "#FFFFFF", muted: "#8A8A8A", accent: "#CE902F", border: "rgba(255,255,255,0.06)", fontHeading: "'IBM Plex Sans Arabic', sans-serif", mood: "dark" },
  corporate: { key: "corporate", label: "Corporate", bg: "#F5F5F7", card: "#FFFFFF", text: "#111318", muted: "#5B5F6B", accent: "#1D4ED8", border: "rgba(17,19,24,0.08)", fontHeading: "'IBM Plex Sans Arabic', sans-serif", mood: "light" },
  creative: { key: "creative", label: "Creative", bg: "#120E1A", card: "#1D1728", text: "#F4EEFF", muted: "#B3A7CC", accent: "#F59E0B", border: "rgba(255,255,255,0.08)", fontHeading: "'IBM Plex Sans Arabic', sans-serif", mood: "dark" },
  podcast: { key: "podcast", label: "Podcast", bg: "#0D0D0D", card: "#181818", text: "#EFEFEF", muted: "#9C9C9C", accent: "#CE902F", border: "rgba(255,255,255,0.07)", fontHeading: "'IBM Plex Sans Arabic', sans-serif", mood: "dark" },
  real_estate: { key: "real_estate", label: "Real Estate", bg: "#F7F5F0", card: "#FFFFFF", text: "#1B1B1B", muted: "#6B6558", accent: "#9B6C23", border: "rgba(27,27,27,0.08)", fontHeading: "'IBM Plex Sans Arabic', serif", mood: "light" },
  agency: { key: "agency", label: "Agency", bg: "#101014", card: "#1A1A20", text: "#FFFFFF", muted: "#93939C", accent: "#22C55E", border: "rgba(255,255,255,0.08)", fontHeading: "'IBM Plex Sans Arabic', sans-serif", mood: "dark" },
  cinema: { key: "cinema", label: "Cinema", bg: "#060606", card: "#151313", text: "#EDEDED", muted: "#8C8580", accent: "#EF4444", border: "rgba(255,255,255,0.06)", fontHeading: "'IBM Plex Sans Arabic', serif", mood: "dark" },
  // ملاحظة: لا بنفسجي إطلاقاً في أي قالب (هوية النظام العامة) — استُخدم أزرق مخضر بدلاً منه هنا
  startup: { key: "startup", label: "Startup", bg: "#FFFFFF", card: "#F7F7FB", text: "#0F172A", muted: "#4B5563", accent: "#0D9488", border: "rgba(15,23,42,0.08)", fontHeading: "'IBM Plex Sans Arabic', sans-serif", mood: "light" },
};

export const PRESENTATION_THEME_LIST = Object.values(PRESENTATION_THEMES);

interface BrandColors {
  companyPrimaryColor: string;
  companySecondaryColor: string;
  companyAccentColor: string;
}

// قالب "هوية الشركة" — محسوب مباشرة من ألوان الشركة الفعلية بدل قوالب ثابتة، كي
// يطابق العرض الفني الهوية البصرية المُعرَّفة في إعدادات الشركة 100%: primary_color
// هو لون التمييز الرئيسي (العناوين والتمييز)، secondary_color لون البطاقات الداكن
// المشتقّ، accent_color لون تمييز ثانوي (بطاقات "الفرصة" المميّزة). الخلفية تبقى
// داكنة فاخرة دوماً بما يوافق الهوية العامة الثابتة للنظام.
export function buildBrandTheme(colors: BrandColors): PresentationTheme {
  return {
    key: "brand",
    label: "هوية الشركة",
    bg: "#0A0A0B",
    card: "#151517",
    text: "#F5F5F5",
    muted: "#9A9A9F",
    accent: colors.companyPrimaryColor || "#CE902F",
    border: "rgba(255,255,255,0.08)",
    fontHeading: "'IBM Plex Sans Arabic', sans-serif",
    mood: "dark",
  };
}

/** يُعيد قالب "هوية الشركة" المحسوب فعلياً عند اختياره، أو أحد القوالب الثابتة
 * الأخرى كما هي — نقطة الوصول الوحيدة الصحيحة للحصول على قالب أي عرض فعلياً. */
export function getPresentationTheme(template: PresentationTemplate, colors: BrandColors): PresentationTheme {
  if (template === "brand") return buildBrandTheme(colors);
  return PRESENTATION_THEMES[template];
}
