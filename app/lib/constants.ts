import type {
  ProjectStatus,
  EpisodeStatus,
  StageStatus,
  NoteStatus,
  NoteRequestType,
  NotePriority,
  ProgressUpdateStage,
  ClientPermissions,
  InvoiceStatus,
  PaymentStatus,
  ContractStatus,
  ProposalStatus,
  ProposalType,
  StoryboardSceneStatus,
  StoryboardCastRole,
  ClientType,
  ClientCrmStatus,
} from "./types";
import type { IconName } from "@/app/components/ui/Icon";

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
  { value: "completed", label: "مكتمل", color: "#1DB954" },
  { value: "delivered", label: "تم التسليم", color: "#10B981" },
  { value: "archived", label: "أرشيف", color: "#6B7280" },
  { value: "cancelled", label: "ملغى", color: "#EF4444" },
];

export const EPISODE_STATUSES: { value: EpisodeStatus; label: string; color: string }[] = [
  { value: "not_started", label: "لم يبدأ", color: "#6B7280" },
  { value: "in_progress", label: "قيد التنفيذ", color: "#F59E0B" },
  { value: "in_review", label: "قيد المراجعة", color: "#06B6D4" },
  { value: "ready_for_approval", label: "بانتظار الاعتماد", color: "#8B5CF6" },
  { value: "approved", label: "تم الاعتماد", color: "#1DB954" },
  { value: "delivered", label: "تم التسليم", color: "#10B981" },
];

export const STAGE_STATUSES: { value: StageStatus; label: string; color: string }[] = [
  { value: "pending", label: "لم يبدأ", color: "#6B7280" },
  { value: "in_progress", label: "قيد التنفيذ", color: "#F59E0B" },
  { value: "completed", label: "مكتمل", color: "#1DB954" },
  { value: "skipped", label: "متخطّى", color: "#94A3B8" },
];

export const NOTE_STATUSES: { value: NoteStatus; label: string; color: string }[] = [
  { value: "new", label: "جديدة", color: "#3B82F6" },
  { value: "in_review", label: "قيد المراجعة", color: "#06B6D4" },
  { value: "in_progress", label: "قيد التنفيذ", color: "#F59E0B" },
  { value: "done", label: "تم التنفيذ", color: "#1DB954" },
  { value: "closed", label: "مكتملة", color: "#6B7280" },
  { value: "rejected", label: "مرفوضة", color: "#EF4444" },
];

// أنواع وأولويات "طلبات التعديل" — القسم الذي كان اسمه "الملاحظات" في بوابة العميل
export const NOTE_REQUEST_TYPES: { value: NoteRequestType; label: string; icon: IconName }[] = [
  { value: "content", label: "تعديل محتوى", icon: "edit" },
  { value: "editing", label: "تعديل مونتاج", icon: "video" },
  { value: "audio", label: "تعديل صوت", icon: "mic" },
  { value: "color", label: "تعديل ألوان", icon: "palette" },
  { value: "text", label: "تعديل نصوص", icon: "fileCheck" },
  { value: "design", label: "تعديل تصميم", icon: "wand" },
  { value: "general", label: "ملاحظة عامة", icon: "message" },
  { value: "other", label: "أخرى", icon: "more" },
];

export const NOTE_PRIORITIES: { value: NotePriority; label: string; color: string }[] = [
  { value: "urgent", label: "عاجل", color: "#EF4444" },
  { value: "medium", label: "متوسط", color: "#F59E0B" },
  { value: "low", label: "منخفض", color: "#6B7280" },
];

// مراحل قسم "العمل الجاري" — توثيق مراحل التنفيذ الفعلية أمام العميل
export const PROGRESS_UPDATE_STAGES: { value: ProgressUpdateStage; label: string; color: string; icon: IconName }[] = [
  { value: "shooting", label: "التصوير", color: "#3987e5", icon: "video" },
  { value: "editing", label: "المونتاج", color: "#F59E0B", icon: "video" },
  { value: "color", label: "التلوين", color: "#8B5CF6", icon: "palette" },
  { value: "audio", label: "الصوت", color: "#06B6D4", icon: "mic" },
  { value: "graphics", label: "الجرافيك", color: "#EC4899", icon: "wand" },
  { value: "review", label: "المراجعة", color: "#F59E0B", icon: "eye" },
  { value: "delivery", label: "التسليم", color: "#1DB954", icon: "checkCircle" },
  { value: "other", label: "أخرى", color: "#6B7280", icon: "more" },
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
  // القيم الافتراضية للمفاتيح الجديدة = true لأن هذه الأقسام كانت تظهر
  // للعميل دون أي بوابة صلاحية من الأساس؛ تعيينها true هنا (وفي هجرة تعبئة
  // الصفوف القديمة) يمنع أي انحسار مفاجئ في وصول كان يعمل فعلاً من قبل.
  bts_view: true,
  bts_comment: true,
  progress_view: true,
  progress_comment: true,
  download_episode_zip: true,
  view_reports: true,
  view_support: true,
  show_project_value: true,
  show_delivery_date: true,
};

export const CLIENT_PERMISSION_LABELS: Record<keyof ClientPermissions, string> = {
  view_project: "مشاهدة المشروع",
  episodes: "مشاهدة الحلقات",
  files: "مشاهدة الملفات",
  download_files: "تحميل الملفات",
  download_project: "تحميل المشروع كاملاً",
  add_notes: "إنشاء طلب تعديل",
  reply_notes: "الرد على طلبات التعديل",
  approve_episodes: "اعتماد الحلقات",
  finance: "مشاهدة المالية",
  payments: "مشاهدة الدفعات",
  invoices: "مشاهدة الفواتير",
  contracts: "مشاهدة العقود",
  proposals: "مشاهدة العروض",
  request_service: "طلب خدمة إضافية",
  request_meeting: "طلب اجتماع",
  upload_attachments: "رفع مرفقات على طلبات التعديل",
  execution_phases: "مشاهدة مراحل التنفيذ",
  script: "مشاهدة السكربت",
  scenario: "مشاهدة السيناريو",
  storyboard: "مشاهدة الستوري بورد",
  bts_view: "مشاهدة الكواليس",
  bts_comment: "التعليق على الكواليس",
  progress_view: "مشاهدة العمل الجاري",
  progress_comment: "التعليق على العمل الجاري",
  download_episode_zip: "تحميل جميع ملفات الحلقة",
  view_reports: "مشاهدة التقارير",
  view_support: "الدعم الفني",
  show_project_value: "إظهار قيمة المشروع",
  show_delivery_date: "إظهار موعد التسليم",
};

export const USER_ROLE_LABELS: Record<string, string> = {
  super_admin: "مدير المنصة",
  company_owner: "مالك الشركة",
  admin: "مدير مشروع",
  team_member: "عضو فريق",
  client: "عميل",
};

// ── الحالات المالية والمستندات (أُضيفت لقسم المالية/الفواتير/العقود/العروض) ──

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string; color: string }[] = [
  { value: "draft", label: "مسودة", color: "#6B7280" },
  { value: "unpaid", label: "غير مدفوعة", color: "#F59E0B" },
  { value: "paid", label: "مدفوعة", color: "#1DB954" },
  { value: "overdue", label: "متأخرة", color: "#EF4444" },
  { value: "cancelled", label: "ملغاة", color: "#94A3B8" },
];

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string; color: string }[] = [
  { value: "pending", label: "معلّقة", color: "#F59E0B" },
  { value: "paid", label: "مدفوعة", color: "#1DB954" },
  { value: "overdue", label: "متأخرة", color: "#EF4444" },
  { value: "cancelled", label: "ملغاة", color: "#94A3B8" },
];

export const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "cash", label: "نقداً" },
  { value: "bank_transfer", label: "تحويل بنكي" },
  { value: "card", label: "بطاقة" },
  { value: "cheque", label: "شيك" },
  { value: "other", label: "أخرى" },
];

export const CONTRACT_STATUSES: { value: ContractStatus; label: string; color: string }[] = [
  { value: "draft", label: "مسودة", color: "#6B7280" },
  { value: "sent", label: "مُرسل", color: "#06B6D4" },
  { value: "pending_signature", label: "بانتظار التوقيع", color: "#8B5CF6" },
  { value: "signed", label: "موقّع", color: "#1DB954" },
  { value: "cancelled", label: "ملغى", color: "#EF4444" },
];

export const PROPOSAL_STATUSES: { value: ProposalStatus; label: string; color: string }[] = [
  { value: "draft", label: "مسودة", color: "#6B7280" },
  { value: "sent", label: "مُرسل", color: "#06B6D4" },
  { value: "accepted", label: "مقبول", color: "#1DB954" },
  { value: "rejected", label: "مرفوض", color: "#EF4444" },
];

export const PROPOSAL_TYPES: { value: ProposalType; label: string }[] = [
  { value: "technical", label: "عرض فني" },
  { value: "financial", label: "عرض مالي" },
  { value: "final", label: "العرض النهائي" },
  { value: "pricing", label: "عرض سعر" },
  { value: "investor", label: "عرض مستثمر" },
  { value: "general", label: "عرض عام" },
];

export const EXPENSE_CATEGORIES: { value: string; label: string }[] = [
  { value: "تصوير", label: "تصوير" },
  { value: "مونتاج", label: "مونتاج" },
  { value: "معدات", label: "معدات" },
  { value: "مواصلات", label: "مواصلات" },
  { value: "تسويق", label: "تسويق" },
  { value: "أخرى", label: "أخرى" },
];

// ── Storyboard: مشاهد الحلقة ──
// ملاحظة: "بانتظار العميل" هنا سماوي (Cyan) بدل البنفسجي المطلوب في الطلب الأصلي — هوية النظام
// لا تستخدم البنفسجي إطلاقاً (نفس الاستبدال المطبَّق على شارة "بانتظار العميل" في معرض الحلقات).
export const STORYBOARD_SCENE_STATUSES: { value: StoryboardSceneStatus; label: string; color: string }[] = [
  { value: "planning", label: "التخطيط", color: "#CE902F" },
  { value: "ready_to_shoot", label: "جاهز للتصوير", color: "#3B82F6" },
  { value: "shot", label: "تم التصوير", color: "#22C55E" },
  { value: "editing", label: "قيد المونتاج", color: "#F59E0B" },
  { value: "client_review", label: "بانتظار العميل", color: "#06B6D4" },
  { value: "approved", label: "تم الاعتماد", color: "#15803D" },
];

export const SHOT_TYPES: string[] = [
  "Establishing Shot",
  "Wide Shot",
  "Medium Shot",
  "Close-up",
  "Extreme Close-up",
  "Over the Shoulder",
  "POV",
  "Low Angle",
  "High Angle",
  "Bird Eye",
  "Tracking Shot",
  "Aerial",
];

export const CAST_ROLE_LABELS: Record<StoryboardCastRole, string> = {
  character: "شخصية",
  model: "موديل",
  client: "العميل",
  host: "مقدّم",
  guest: "ضيف",
};

export const CAMERA_SETUP_FIELDS: { key: string; label: string }[] = [
  { key: "camera_type", label: "نوع الكاميرا" },
  { key: "lens", label: "العدسة" },
  { key: "focal_length", label: "البعد البؤري" },
  { key: "aperture", label: "فتحة العدسة" },
  { key: "iso", label: "ISO" },
  { key: "shutter", label: "Shutter" },
  { key: "frame_rate", label: "Frame Rate" },
  { key: "resolution", label: "Resolution" },
  { key: "picture_profile", label: "Picture Profile" },
  { key: "white_balance", label: "White Balance" },
  { key: "nd_filter", label: "ND Filter" },
  { key: "movement_type", label: "نوع الحركة" },
  { key: "gimbal", label: "الجيمبل" },
  { key: "tripod", label: "الحامل" },
  { key: "mic", label: "المايك" },
  { key: "lighting", label: "الإضاءة" },
];

export const DIRECTOR_NOTES_FIELDS: { key: string; label: string }[] = [
  { key: "camera_movement", label: "طريقة حركة الكاميرا" },
  { key: "angle", label: "زاوية التصوير" },
  { key: "actor_movement", label: "حركة الممثل" },
  { key: "mood", label: "الإحساس المطلوب" },
  { key: "lighting", label: "الإضاءة المطلوبة" },
  { key: "colors", label: "الألوان" },
  { key: "music_type", label: "نوع الموسيقى" },
  { key: "effects", label: "المؤثرات" },
  { key: "transition", label: "طريقة الانتقال" },
];

// ── العملاء (CRM) ──
export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  company: "شركة",
  individual: "فرد",
  agency: "وكالة",
};

// ملاحظة: "بانتظار الرد" هنا سماوي بدل البنفسجي — نفس قرار عدم استخدام البنفسجي إطلاقاً
// المطبَّق سابقاً على شارات الحلقات ومشاهد Storyboard.
export const CLIENT_CRM_STATUSES: { value: ClientCrmStatus; label: string; color: string }[] = [
  { value: "active", label: "نشط", color: "#22C55E" },
  { value: "paused", label: "متوقف", color: "#F59E0B" },
  { value: "completed", label: "مكتمل", color: "#3B82F6" },
  { value: "awaiting_reply", label: "بانتظار الرد", color: "#06B6D4" },
];
