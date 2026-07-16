import type { PresentationData } from "@/app/lib/presentation-sections";

// كتيّب المشروع النهائي — يُستخدم عادة بعد انتهاء المشروع لتسليم ملخص شامل
// للعميل، بعكس العرض الفني (قبل البدء). يعيد استخدام كل بيانات PresentationData
// (اسم/وصف/شعار/ألوان/خدمات/حلقات/فريق/مواقع/ملفات...) ويضيف فوقها بيانات
// رجعية-محورية (retrospective) حقيقية: سجل نشاط فعلي، وإحصائيات إنجاز محسوبة.

export interface BookletActivityEntry {
  id: string;
  label: string;
  episodeTitle: string | null;
  createdAt: string;
}

export interface BookletData extends PresentationData {
  totalEpisodes: number;
  completedEpisodes: number;
  totalFiles: number;
  totalDurationSeconds: number;
  projectStartDate: string;
  projectDeliveredDate: string | null;
  daysElapsed: number | null;
  activityLog: BookletActivityEntry[];
}

export interface BookletSectionDef {
  key: string;
  label: string;
  category: "intro" | "journey" | "content" | "closing";
  isAvailable: (data: BookletData) => boolean;
}

export const BOOKLET_SECTIONS: BookletSectionDef[] = [
  { key: "cover", label: "صفحة الغلاف", category: "intro", isAvailable: () => true },
  { key: "handover_message", label: "رسالة التسليم", category: "intro", isAvailable: () => true },
  { key: "company_bio", label: "نبذة عن الشركة", category: "intro", isAvailable: () => true },
  { key: "project_overview", label: "نظرة عامة على المشروع", category: "intro", isAvailable: () => true },
  { key: "achievements", label: "الإنجازات بالأرقام", category: "journey", isAvailable: () => true },
  { key: "journey", label: "رحلة المشروع", category: "journey", isAvailable: (d) => d.stages.length > 0 },
  { key: "activity_log", label: "سجل ما تم تنفيذه", category: "journey", isAvailable: (d) => d.activityLog.length > 0 },
  { key: "episodes_detailed", label: "الحلقات بالتفصيل", category: "content", isAvailable: (d) => d.episodes.length > 0 },
  { key: "team", label: "الفريق", category: "content", isAvailable: (d) => d.team.length > 0 },
  { key: "locations", label: "المواقع", category: "content", isAvailable: (d) => d.locations.length > 0 },
  { key: "gallery", label: "خلف الكواليس", category: "content", isAvailable: (d) => d.galleryImages.length > 0 },
  { key: "files", label: "الملفات والمخرجات", category: "content", isAvailable: (d) => Object.values(d.fileCounts).some((n) => n > 0) },
  { key: "closing", label: "رسالة ختامية", category: "closing", isAvailable: () => true },
];

export function buildDefaultBookletSectionConfig(data: BookletData): { key: string; enabled: boolean }[] {
  return BOOKLET_SECTIONS.map((s) => ({ key: s.key, enabled: s.isAvailable(data) }));
}
