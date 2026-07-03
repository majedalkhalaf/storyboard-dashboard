// خادم تخزين Supabase يرفض أي مفتاح كائن (storage key) يحتوي أحرفاً خارج مجموعة محدودة
// بخطأ "Invalid key" — ويشمل ذلك الأحرف العربية وأي Unicode آخر. أسماء الملفات الحقيقية
// (خصوصاً بالعربية) لا يجب أن تُستخدم مباشرة داخل مسار التخزين لهذا السبب: يُستبدل الاسم
// بالكامل بمعرّف عشوائي + الامتداد فقط، بينما يبقى الاسم الأصلي مقروءاً محفوظاً في عمود
// `name` بجدول قاعدة البيانات (حيث يوجد) لغرض العرض.
export function safeStorageKey(originalName: string): string {
  const dot = originalName.lastIndexOf(".");
  const rawExt = dot > -1 ? originalName.slice(dot + 1) : "";
  const ext = rawExt.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  return `${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
}
