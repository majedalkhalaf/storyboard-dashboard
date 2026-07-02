import type { ProjectStatus, EpisodeStatus, StageStatus, NoteStatus, ClientPermissions } from "./types";

export const PROJECT_TYPES: { value: string; label: string }[] = [
  { value: "podcast", label: "بودكاست" },
  { value: "commercial_ad", label: "إعلان تجاري" },
  { value: "product_photography", label: "تصوير منتجات" },
  { value: "real_estate", label: "تصوير عقاري" },
  { value: "youtube_video", label: "فيديو يوتيوب" },
  { value: "reels", label: "ريلز" },
  { value: "event_coverage", label: "تصوير فعاليات" },
  { value: "corporate_video", label: "فيديو شركات" },
  { value: "documentary", label: "وثائقي" },
  { value: "brand_identity", label: "هوية بصرية" },
  { value: "motion_graphics", label: "موشن جرافيك" },
  { value: "other", label: "أخرى" },
];

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; color: string }[] = [
  { value: "planning", label: "تخطيط", color: "#8B5CF6" },
  { value: "in_progress", label: "قيد التنفيذ", color: "#F59E0B" },
  { value: "review", label: "مراجعة", color: "#06B6D4" },
  { value: "completed", label: "مكتمل", color: "#22C55E" },
  { value: "delivered", label: "تم التسليم", color: "#10B981" },
  { value: "archived", label: "أرشيف", color: "#6B7280" },
  { value: "cancelled", label: "ملغى", color: "#EF4444" },
];

export const EPISODE_STATUSES: { value: EpisodeStatus; label: string; color: string }[] = [
  { value: "not_started", label: "لم يبدأ", color: "#6B7280" },
  { value: "in_progress", label: "قيد التنفيذ", color: "#F59E0B" },
  { value: "in_review", label: "قيد المراجعة", color: "#06B6D4" },
  { value: "ready_for_approval", label: "بانتظار الاعتماد", color: "#8B5CF6" },
  { value: "approved", label: "تم الاعتماد", color: "#22C55E" },
  { value: "delivered", label: "تم التسليم", color: "#10B981" },
];

export const STAGE_STATUSES: { value: StageStatus; label: string; color: string }[] = [
  { value: "pending", label: "لم يبدأ", color: "#6B7280" },
  { value: "in_progress", label: "قيد التنفيذ", color: "#F59E0B" },
  { value: "completed", label: "مكتمل", color: "#22C55E" },
  { value: "skipped", label: "متخطّى", color: "#94A3B8" },
];

export const NOTE_STATUSES: { value: NoteStatus; label: string; color: string }[] = [
  { value: "new", label: "جديدة", color: "#3B82F6" },
  { value: "in_review", label: "قيد المراجعة", color: "#06B6D4" },
  { value: "in_progress", label: "قيد التنفيذ", color: "#F59E0B" },
  { value: "done", label: "تم التنفيذ", color: "#22C55E" },
  { value: "closed", label: "مغلقة", color: "#6B7280" },
  { value: "rejected", label: "مرفوضة", color: "#EF4444" },
];

// المراحل الافتراضية لكل حلقة جديدة — يمكن تعديلها/حذفها لاحقاً لكل حلقة
export const DEFAULT_EPISODE_STAGES: { key: string; label: string }[] = [
  { key: "idea", label: "تطوير الفكرة" },
  { key: "script", label: "كتابة السكربت" },
  { key: "scenario", label: "السيناريو" },
  { key: "storyboard", label: "Storyboard" },
  { key: "shooting", label: "التصوير" },
  { key: "audio", label: "تسجيل الصوت" },
  { key: "editing", label: "المونتاج" },
  { key: "color", label: "تصحيح الألوان" },
  { key: "review", label: "المراجعة" },
  { key: "delivery", label: "التسليم" },
];

export interface ServiceCatalogItem {
  key: string;
  label: string;
}

export interface ServiceCatalogGroup {
  category: string;
  label: string;
  services: ServiceCatalogItem[];
}

export const SERVICES_CATALOG: ServiceCatalogGroup[] = [
  {
    category: "planning",
    label: "التخطيط والفكرة",
    services: [
      { key: "idea_development", label: "تطوير الفكرة" },
      { key: "script_writing", label: "كتابة السكربت" },
      { key: "scenario", label: "السيناريو" },
      { key: "storyboard", label: "Storyboard" },
      { key: "project_management", label: "إدارة المشروع" },
      { key: "research", label: "البحث والإلهام" },
    ],
  },
  {
    category: "production",
    label: "التصوير",
    services: [
      { key: "filming", label: "التصوير" },
      { key: "photography", label: "التصوير الفوتوغرافي" },
      { key: "aerial", label: "التصوير الجوي" },
      { key: "audio_recording", label: "تسجيل الصوت" },
      { key: "lighting", label: "الإضاءة" },
      { key: "directing", label: "الإخراج" },
    ],
  },
  {
    category: "post_production",
    label: "المونتاج وما بعد الإنتاج",
    services: [
      { key: "editing", label: "المونتاج" },
      { key: "color_grading", label: "تصحيح الألوان" },
      { key: "motion_graphics", label: "Motion Graphics" },
      { key: "vfx", label: "المؤثرات البصرية" },
      { key: "thumbnail_design", label: "تصميم الصور المصغرة" },
      { key: "subtitling", label: "الترجمة" },
      { key: "voice_over", label: "التعليق الصوتي" },
    ],
  },
  {
    category: "delivery",
    label: "التسليم",
    services: [
      { key: "file_organization", label: "تنظيم الملفات" },
      { key: "content_management", label: "إدارة المحتوى" },
      { key: "publishing", label: "النشر" },
      { key: "delivery", label: "التسليم" },
    ],
  },
];

export const DEFAULT_CLIENT_PERMISSIONS: ClientPermissions = {
  view_project: true,
  episodes: true,
  files: true,
  download_files: true,
  download_project: false,
  add_notes: true,
  reply_notes: true,
  approve_episodes: true,
  finance: false,
  payments: false,
  invoices: true,
  contracts: false,
  proposals: false,
  request_service: false,
  request_meeting: false,
  upload_attachments: true,
  execution_phases: true,
  script: false,
  scenario: false,
  storyboard: false,
};

export const CLIENT_PERMISSION_LABELS: Record<keyof ClientPermissions, string> = {
  view_project: "مشاهدة المشروع",
  episodes: "مشاهدة الحلقات",
  files: "مشاهدة الملفات",
  download_files: "تحميل الملفات",
  download_project: "تحميل المشروع كاملاً",
  add_notes: "إضافة ملاحظة",
  reply_notes: "الرد على ملاحظة",
  approve_episodes: "اعتماد الحلقات",
  finance: "مشاهدة المالية",
  payments: "مشاهدة الدفعات",
  invoices: "مشاهدة الفواتير",
  contracts: "مشاهدة العقود",
  proposals: "مشاهدة العروض",
  request_service: "طلب خدمة إضافية",
  request_meeting: "طلب اجتماع",
  upload_attachments: "رفع مرفقات",
  execution_phases: "مشاهدة مراحل التنفيذ",
  script: "مشاهدة السكربت",
  scenario: "مشاهدة السيناريو",
  storyboard: "مشاهدة الستوري بورد",
};

export const USER_ROLE_LABELS: Record<string, string> = {
  super_admin: "مدير المنصة",
  company_owner: "مالك الشركة",
  admin: "مدير مشروع",
  team_member: "عضو فريق",
  client: "عميل",
};
