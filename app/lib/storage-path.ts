import type { FileCategory } from "./types";

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

const CATEGORY_FOLDER: Record<FileCategory, string> = {
  video: "videos",
  image: "images",
  document: "documents",
  audio: "audio",
  archive: "archive",
  design: "design",
  project_file: "project_files",
  link: "links",
  other: "other",
};

/**
 * مسار تخزين منظّم حسب الشركة/المشروع/الحلقة (إن وُجدت)/تصنيف الملف —
 * مثال: company_id/project_id/episodes/episode_id/videos/<key>.mp4
 */
export function buildFilePath(params: {
  companyId: string;
  projectId: string;
  episodeId?: string | null;
  category: FileCategory;
  originalName: string;
}): string {
  const folder = CATEGORY_FOLDER[params.category];
  const key = safeStorageKey(params.originalName);
  const base = params.episodeId
    ? `${params.companyId}/${params.projectId}/episodes/${params.episodeId}/${folder}`
    : `${params.companyId}/${params.projectId}/${folder}`;
  return `${base}/${key}`;
}
