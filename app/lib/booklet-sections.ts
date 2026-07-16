import type { PresentationData, PresentationGalleryImage } from "@/app/lib/presentation-sections";
import type { CameraSetup, DirectorNotes } from "@/app/lib/types";

// كتيّب المشروع النهائي — يُستخدم عادة بعد انتهاء المشروع لتسليم ملخص شامل
// للعميل، بعكس العرض الفني (قبل البدء). يعيد استخدام كل بيانات PresentationData
// (اسم/وصف/شعار/ألوان/خدمات/حلقات/فريق/مواقع/ملفات...) ويضيف فوقها بيانات
// رجعية-محورية (retrospective) حقيقية بالكامل: سجل نشاط فعلي، إحصائيات إنجاز
// محسوبة، بطاقة عميل، خطة تنفيذية بالمسؤولين، Storyboard تفصيلي، اعتمادات،
// ملاحظات، فيديوهات، وملخص مالي اختياري. لا حقل واحد هنا مُختلَق — كل قيمة
// مصدرها استعلام حقيقي (راجع booklet-data-server.ts).

export interface BookletActivityEntry {
  id: string;
  label: string;
  episodeTitle: string | null;
  createdAt: string;
  category: "upload" | "edit" | "approval" | "note" | "stage" | "other";
}

export interface BookletClientCard {
  name: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
}

export interface BookletExecutionStage {
  key: string;
  label: string;
  episodesTotal: number;
  completed: number;
  inProgress: number;
  earliestStart: string | null;
  latestEnd: string | null;
  responsibleNames: string[];
}

export interface BookletTeamStat {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  stagesAssigned: number;
  stagesCompleted: number;
  completionRate: number;
}

export interface BookletStoryboardScene {
  id: string;
  episodeTitle: string;
  number: number | null;
  title: string;
  cover_image_url: string | null;
  shot_type: string | null;
  location: string | null;
  cameraSetup: CameraSetup;
  directorNotes: DirectorNotes;
  castNames: string[];
  equipmentNames: string[];
}

export interface BookletApprovalEntry {
  id: string;
  episodeTitle: string | null;
  approverName: string | null;
  approvedAt: string;
  revoked: boolean;
}

export interface BookletNoteEntry {
  id: string;
  body: string;
  authorRole: string | null;
  authorName: string | null;
  status: string;
  episodeTitle: string | null;
  createdAt: string;
}

export interface BookletVideoEntry {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  episodeId: string | null;
  episodeTitle: string | null;
}

export interface BookletFinanceSummary {
  invoicesCount: number;
  invoicesPaidTotal: number;
  invoicesUnpaidTotal: number;
  paymentsReceivedTotal: number;
  expensesTotal: number;
  contractsCount: number;
  proposalsCount: number;
  budget: number | null;
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
  client: BookletClientCard;
  executionPlan: BookletExecutionStage[];
  teamStats: BookletTeamStat[];
  storyboardDetailed: BookletStoryboardScene[];
  approvalsList: BookletApprovalEntry[];
  notesList: BookletNoteEntry[];
  videosList: BookletVideoEntry[];
  galleryImagesExtended: PresentationGalleryImage[];
  finance: BookletFinanceSummary | null;
}

export interface BookletSectionDef {
  key: string;
  label: string;
  category: "intro" | "journey" | "content" | "closing";
  isAvailable: (data: BookletData) => boolean;
}

export const BOOKLET_SECTIONS: BookletSectionDef[] = [
  { key: "cover", label: "صفحة الغلاف", category: "intro", isAvailable: () => true },
  { key: "toc", label: "الفهرس", category: "intro", isAvailable: () => true },
  { key: "handover_message", label: "رسالة التسليم", category: "intro", isAvailable: () => true },
  { key: "company_bio", label: "نبذة عن الشركة", category: "intro", isAvailable: () => true },
  { key: "client_card", label: "بيانات العميل", category: "intro", isAvailable: () => true },
  { key: "project_overview", label: "نظرة عامة على المشروع", category: "intro", isAvailable: () => true },
  { key: "achievements", label: "الإنجازات بالأرقام", category: "intro", isAvailable: () => true },
  { key: "journey", label: "رحلة المشروع", category: "journey", isAvailable: (d) => d.stages.length > 0 },
  { key: "execution_plan", label: "الخطة التنفيذية", category: "journey", isAvailable: (d) => d.executionPlan.length > 0 },
  { key: "activity_log", label: "سجل ما تم تنفيذه", category: "journey", isAvailable: (d) => d.activityLog.length > 0 },
  { key: "approvals", label: "الاعتمادات", category: "journey", isAvailable: (d) => d.approvalsList.length > 0 },
  { key: "episodes_detailed", label: "الحلقات بالتفصيل", category: "content", isAvailable: (d) => d.episodes.length > 0 },
  { key: "storyboard", label: "Storyboard التفصيلي", category: "content", isAvailable: (d) => d.storyboardDetailed.length > 0 },
  { key: "videos", label: "الفيديوهات", category: "content", isAvailable: (d) => d.videosList.length > 0 },
  { key: "team", label: "الفريق", category: "content", isAvailable: (d) => d.team.length > 0 },
  { key: "equipment", label: "المعدات", category: "content", isAvailable: (d) => d.equipmentNames.length > 0 },
  { key: "locations", label: "المواقع", category: "content", isAvailable: (d) => d.locations.length > 0 },
  { key: "gallery", label: "خلف الكواليس والمعرض", category: "content", isAvailable: (d) => d.galleryImagesExtended.length > 0 },
  { key: "files", label: "الملفات والمخرجات", category: "content", isAvailable: (d) => Object.values(d.fileCounts).some((n) => n > 0) },
  { key: "notes", label: "الملاحظات", category: "content", isAvailable: (d) => d.notesList.length > 0 },
  { key: "finance", label: "الملخص المالي (اختياري)", category: "content", isAvailable: (d) => Boolean(d.finance) },
  { key: "closing", label: "رسالة ختامية", category: "closing", isAvailable: () => true },
];

// المالية معطّلة افتراضياً دائماً بغض النظر عن توفر بياناتها — يحوي هذا الكتيّب
// وثيقة تُسلَّم للعميل، ولا يجب أن تُفصح تلقائياً عن أي رقم مالي داخلي (ميزانية/
// مصروفات) دون تفعيل صريح من الفريق لكل كتيّب على حدة.
const DEFAULT_DISABLED_KEYS = new Set(["finance"]);

export function buildDefaultBookletSectionConfig(data: BookletData): { key: string; enabled: boolean }[] {
  return BOOKLET_SECTIONS.map((s) => ({
    key: s.key,
    enabled: DEFAULT_DISABLED_KEYS.has(s.key) ? false : s.isAvailable(data),
  }));
}

// يبني بنود الفهرس (تسمية + رقم صفحة حقيقي = ترتيب الظهور الفعلي) من قائمة
// الأقسام المفعّلة والمرتّبة — يُستخدم في قنوات الطباعة/PDF وHTML حيث كل قسم
// صفحة كاملة مستقلة، فرقم الصفحة هو ببساطة الفهرس (index) + 1.
export function buildTocEntries(ordered: string[]): { key: string; label: string; page: number }[] {
  return ordered
    .filter((key) => key !== "toc")
    .map((key, i) => ({ key, label: BOOKLET_SECTIONS.find((d) => d.key === key)?.label ?? key, page: i + 1 }));
}
