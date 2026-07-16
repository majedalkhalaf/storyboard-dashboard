import type { FileCategory } from "@/app/lib/types";

// كتالوج أقسام العرض التقديمي — كل قسم له مفتاح/تسمية/تصنيف ودالة `isAvailable` تقرر
// إن كان يظهر افتراضياً بناءً على وجود بيانات حقيقية له في المشروع (بدون تدخل يدوي).
// بعض الأقسام المطلوبة أصلاً كانت متكررة بمعنى واحد بمسميين مختلفين — تم دمجها هنا
// بدل تكرار نفس البيانات في صفحتين فارغتين شكلياً:
//   • "Timeline" و"رحلة المشروع" → قسم واحد "رحلة المشروع" (تدفّق مراحل + تواريخ فعلية)
//   • "المرفقات" و"الملفات" → قسم واحد "الملفات" (كلاهما يعتمد على جدول files نفسه)
//   • "Deliverables" و"ما سيحصل عليه العميل" → قسم واحد "المخرجات النهائية"

export interface PresentationFileGroups {
  image: number;
  video: number;
  document: number;
  audio: number;
  archive: number;
  design: number;
  project_file: number;
  link: number;
  other: number;
}

export interface PresentationEpisodeSummary {
  id: string;
  number: number | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  status: string;
  progress: number;
  duration_seconds: number | null;
  script: string | null;
  scenario: string | null;
  stagesCompleted: number;
  stagesTotal: number;
  hasStoryboard: boolean;
  storyboardScenesCount: number;
}

export interface PresentationStageSummary {
  key: string;
  label: string;
  episodesTotal: number;
  completed: number;
  inProgress: number;
  earliestStart: string | null;
  latestEnd: string | null;
}

// مراحل حلقة واحدة بالتفصيل (تُستخدم في قسم "مراحل التنفيذ التفصيلية")
export interface PresentationEpisodeStageEntry {
  key: string;
  label: string;
  status: string;
}

// مشهد Storyboard واحد مسطّح عبر كل حلقات المشروع (لقسم "Storyboard")
export interface PresentationStoryboardScene {
  id: string;
  episodeId: string;
  episodeTitle: string;
  number: number | null;
  title: string;
  cover_image_url: string | null;
  shot_type: string | null;
}

// صورة معرض واحدة برابط مُحلَّل جاهز للعرض مباشرة (لقسم "معرض الصور")
export interface PresentationGalleryImage {
  id: string;
  name: string;
  url: string;
}

// رابط مرجعي واحد (ملفات بتصنيف "link") لقسم "المراجع"
export interface PresentationReferenceLink {
  id: string;
  name: string;
  url: string;
}

export interface PresentationData {
  companyId: string;
  projectId: string;
  companyName: string;
  companyLogoUrl: string | null;
  companyPrimaryColor: string;
  companySecondaryColor: string;
  companyAccentColor: string;
  companyPhone: string | null;
  companyEmail: string | null;
  companyWebsite: string | null;
  companyWhatsapp: string | null;
  companyAddress: string | null;
  companyCurrency: string;
  clientName: string | null;
  clientLogoUrl: string | null;
  projectName: string;
  projectCoverUrl: string | null;
  projectCreatedAt: string;
  projectDescription: string | null;
  projectLocation: string | null;
  shootingDate: string | null;
  deliveryDate: string | null;
  progress: number;
  services: { category: string; label: string }[];
  episodes: PresentationEpisodeSummary[];
  stages: PresentationStageSummary[];
  hasAnyStoryboard: boolean;
  hasAnyScript: boolean;
  team: { id: string; full_name: string | null; avatar_url: string | null }[];
  locations: string[];
  equipmentNames: string[];
  fileCounts: PresentationFileGroups;
  referenceLinksCount: number;
  updatedAt: string;
  // حقول إضافية تراكمية (additive) لدعم أقسام تحتاج تفاصيل أدق من الملخصات أعلاه —
  // لا تُغيّر أي حقل موجود، فقط تضيف بيانات جديدة اختيارية الاستخدام لكل قسم.
  stagesByEpisode: Record<string, PresentationEpisodeStageEntry[]>;
  storyboardScenes: PresentationStoryboardScene[];
  galleryImages: PresentationGalleryImage[];
  referenceLinks: PresentationReferenceLink[];
}

export interface PresentationSectionDef {
  key: string;
  label: string;
  category: "intro" | "strategy" | "execution" | "content" | "closing";
  isAvailable: (data: PresentationData) => boolean;
}

export const PRESENTATION_SECTIONS: PresentationSectionDef[] = [
  { key: "cover", label: "صفحة الغلاف", category: "intro", isAvailable: () => true },
  { key: "welcome", label: "رسالة ترحيبية", category: "intro", isAvailable: () => true },
  { key: "company_bio", label: "نبذة عن الشركة", category: "intro", isAvailable: () => true },
  { key: "why_project", label: "لماذا هذا المشروع", category: "strategy", isAvailable: () => true },
  { key: "objectives", label: "أهداف المشروع", category: "strategy", isAvailable: () => true },
  { key: "audience", label: "الجمهور المستهدف", category: "strategy", isAvailable: () => true },
  { key: "creative_idea", label: "الفكرة الإبداعية", category: "strategy", isAvailable: (d) => Boolean(d.projectDescription) },
  { key: "visual_identity", label: "الهوية البصرية", category: "strategy", isAvailable: () => true },
  { key: "shooting_style", label: "أسلوب التصوير", category: "strategy", isAvailable: () => true },
  { key: "project_journey", label: "رحلة المشروع (Timeline)", category: "execution", isAvailable: (d) => d.stages.length > 0 },
  { key: "stages_detail", label: "مراحل التنفيذ التفصيلية", category: "execution", isAvailable: (d) => d.episodes.some((e) => e.stagesTotal > 0) },
  { key: "episodes", label: "الحلقات", category: "content", isAvailable: (d) => d.episodes.length > 0 },
  { key: "episode_details", label: "تفاصيل كل حلقة", category: "content", isAvailable: (d) => d.episodes.length > 0 },
  { key: "storyboard", label: "Storyboard", category: "content", isAvailable: (d) => d.hasAnyStoryboard },
  { key: "script", label: "السكربت", category: "content", isAvailable: (d) => d.hasAnyScript },
  { key: "equipment", label: "المعدات", category: "execution", isAvailable: (d) => d.equipmentNames.length > 0 },
  { key: "team", label: "الفريق", category: "execution", isAvailable: (d) => d.team.length > 0 },
  { key: "locations", label: "المواقع", category: "execution", isAvailable: (d) => d.locations.length > 0 },
  { key: "gallery", label: "معرض الصور (Gallery)", category: "content", isAvailable: (d) => d.fileCounts.image > 0 },
  { key: "references", label: "المراجع", category: "content", isAvailable: (d) => d.referenceLinksCount > 0 },
  { key: "files", label: "الملفات والمرفقات", category: "content", isAvailable: (d) => Object.values(d.fileCounts).some((n) => n > 0) },
  { key: "deliverables", label: "المخرجات النهائية", category: "closing", isAvailable: (d) => d.services.length > 0 },
  { key: "faq", label: "الأسئلة الشائعة", category: "closing", isAvailable: () => true },
  { key: "terms", label: "الشروط والأحكام", category: "closing", isAvailable: () => true },
  { key: "thanks", label: "صفحة الشكر", category: "closing", isAvailable: () => true },
];

export const FILE_CATEGORY_KEYS: FileCategory[] = ["image", "video", "document", "audio", "archive", "design", "project_file", "link", "other"];

export function buildDefaultSectionConfig(data: PresentationData): { key: string; enabled: boolean }[] {
  return PRESENTATION_SECTIONS.map((s) => ({ key: s.key, enabled: s.isAvailable(data) }));
}
