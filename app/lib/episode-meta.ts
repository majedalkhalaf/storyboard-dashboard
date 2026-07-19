// قراءة آمنة من episodes.meta (jsonb حر بلا قيد) — يُستخدم من تبويب "الفكرة
// والتفاصيل" (MetaFieldsTab) وقسم تفاصيل الحلقة في بوابة العميل (EpisodeMetaSection)
// لتفادي أي افتراض حول شكل القيمة المخزَّنة.

export function getMetaValue(meta: Record<string, unknown> | null | undefined, key: string): string {
  const v = meta?.[key];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string").join(", ");
  return typeof v === "string" ? v : "";
}

export function getMetaTags(meta: Record<string, unknown> | null | undefined, key: string): string[] {
  const v = meta?.[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}
