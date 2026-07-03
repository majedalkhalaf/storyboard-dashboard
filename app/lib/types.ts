// أنواع بيانات النظام — تطابق مخطط supabase/migrations/0001_init_multi_tenant.sql

export type UserRole = "super_admin" | "company_owner" | "admin" | "team_member" | "client";

export type ProjectStatus =
  | "planning"
  | "in_progress"
  | "review"
  | "completed"
  | "delivered"
  | "archived"
  | "cancelled";

export type EpisodeStatus =
  | "not_started"
  | "in_progress"
  | "in_review"
  | "ready_for_approval"
  | "approved"
  | "delivered";

export type StageStatus = "pending" | "in_progress" | "completed" | "skipped";

export type NoteStatus = "new" | "in_review" | "in_progress" | "done" | "closed" | "rejected";

export type NoteTargetType =
  | "project"
  | "episode"
  | "video"
  | "image"
  | "file"
  | "script"
  | "scenario"
  | "storyboard";

export type FileCategory = "image" | "video" | "document" | "audio" | "archive" | "design" | "project_file" | "link" | "other";

export type FileStatus = "uploading" | "ready" | "failed";

export type StoryboardSceneStatus = "planning" | "ready_to_shoot" | "shot" | "editing" | "client_review" | "approved";

export type StoryboardCastRole = "character" | "model" | "client" | "host" | "guest";

export type InvoiceStatus = "draft" | "unpaid" | "paid" | "overdue" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled";
export type ContractStatus = "draft" | "sent" | "pending_signature" | "signed" | "cancelled";
export type ProposalStatus = "draft" | "sent" | "accepted" | "rejected";
export type ProposalType = "technical" | "financial" | "final" | "pricing" | "investor" | "general";

// نصوص افتراضية على مستوى الشركة (تُستخدم كقيمة مبدئية لأي عرض تقديمي جديد)
export interface PresentationDefaultTexts {
  welcome_message?: string;
  company_bio?: string;
  company_values?: string;
  company_vision?: string;
  ceo_message?: string;
  faq?: { question: string; answer: string }[];
  terms?: string;
  thanks_message?: string;
}

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_ar: string | null;
  font_en: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  commercial_register: string | null;
  tax_number: string | null;
  social_links: Record<string, string>;
  stamp_url: string | null;
  signature_url: string | null;
  presentation_defaults: PresentationDefaultTexts;
  // إعدادات مالية أساسية — supabase/migrations/0019_finance_settings.sql
  default_tax_rate: number;
  invoice_number_prefix: string;
  default_payment_terms_days: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  company_id: string | null;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export type ClientType = "company" | "individual" | "agency";
export type ClientCrmStatus = "active" | "paused" | "completed" | "awaiting_reply";

export interface ClientRecord {
  id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  client_type: ClientType;
  city: string | null;
  logo_url: string | null;
  contact_name: string | null;
  assigned_to: string | null;
  status: ClientCrmStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  job_title: string | null;
  client_company_name: string | null;
}

export interface Project {
  id: string;
  company_id: string;
  client_id: string | null;
  created_by: string | null;
  name: string;
  type: string | null;
  custom_type: string | null;
  status: ProjectStatus;
  cover_image_url: string | null;
  shooting_date: string | null;
  delivery_date: string | null;
  budget: number | null;
  location: string | null;
  storage_link: string | null;
  description: string | null;
  notes: string | null;
  progress: number;
  archived: boolean;
  created_at: string;
  updated_at: string;
  code: string | null;
}

export interface ProjectServiceItem {
  id: string;
  project_id: string;
  company_id: string;
  category: string;
  service_key: string;
  label: string;
  is_custom: boolean;
  created_at: string;
}

export interface Episode {
  id: string;
  project_id: string;
  company_id: string;
  number: number | null;
  title: string;
  cover_image_url: string | null;
  description: string | null;
  type: string | null;
  status: EpisodeStatus;
  progress: number;
  script: string | null;
  scenario: string | null;
  sort_order: number;
  duration_seconds: number | null;
  assigned_to: string | null;
  shooting_date: string | null;
  delivery_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  pipeline_stage: string;
}

// مرحلة "تغيير المرحلة" السريعة — منفصلة تماماً عن نظام episode_stages التفصيلي،
// وقابلة للتخصيص لكل شركة من الإعدادات.
export interface CompanyPipelineStage {
  id: string;
  company_id: string;
  key: string;
  label: string;
  color: string;
  notify_client: boolean;
  sort_order: number;
}

export interface EpisodeScriptVersion {
  id: string;
  company_id: string;
  episode_id: string;
  field: "script" | "scenario";
  content: string;
  created_by: string | null;
  created_at: string;
}

export interface EpisodeStage {
  id: string;
  episode_id: string;
  company_id: string;
  key: string;
  label: string;
  status: StageStatus;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  updated_by: string | null;
  assigned_to: string | null;
  notes: string | null;
  sort_order: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectFile {
  id: string;
  company_id: string;
  project_id: string;
  episode_id: string | null;
  scene_id: string | null;
  uploaded_by: string | null;
  name: string;
  storage_path: string | null;
  external_url: string | null;
  file_type: string | null;
  category: FileCategory;
  size_bytes: number | null;
  client_visible: boolean;
  created_at: string;
  original_name: string | null;
  mime_type: string | null;
  file_extension: string | null;
  bucket_name: string;
  uploaded_by_role: string | null;
  client_can_view: boolean;
  client_can_download: boolean;
  is_public: boolean;
  version: number;
  status: FileStatus;
  thumbnail_url: string | null;
  preview_url: string | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  metadata: Record<string, unknown>;
  updated_at: string;
}

export interface Note {
  id: string;
  company_id: string;
  project_id: string;
  episode_id: string | null;
  scene_id: string | null;
  target_type: NoteTargetType;
  target_id: string | null;
  parent_note_id: string | null;
  author_id: string;
  author_role: string | null;
  body: string;
  status: NoteStatus;
  mentions: string[];
  attachments: { name: string; url: string }[];
  video_timestamp_seconds: number | null;
  created_at: string;
  updated_at: string;
}

// حزمتا الإعدادات المرنتان (JSONB) داخل storyboard_scenes — المفاتيح هنا هي العقد الفعلي
// المتوقَّع، حتى لو كان العمود نفسه بلا مخطط ملزم في قاعدة البيانات.
export interface CameraSetup {
  camera_type?: string;
  lens?: string;
  focal_length?: string;
  aperture?: string;
  iso?: string;
  shutter?: string;
  frame_rate?: string;
  resolution?: string;
  picture_profile?: string;
  white_balance?: string;
  nd_filter?: string;
  movement_type?: string;
  gimbal?: string;
  tripod?: string;
  mic?: string;
  lighting?: string;
}

export interface DirectorNotes {
  camera_movement?: string;
  angle?: string;
  actor_movement?: string;
  mood?: string;
  lighting?: string;
  colors?: string;
  music_type?: string;
  effects?: string;
  transition?: string;
}

export interface StoryboardScene {
  id: string;
  company_id: string;
  episode_id: string;
  number: number | null;
  title: string;
  description: string | null;
  shot_goal: string | null;
  cover_image_url: string | null;
  duration_seconds: number | null;
  shot_type: string | null;
  location: string | null;
  shooting_date: string | null;
  shooting_time: string | null;
  status: StoryboardSceneStatus;
  progress: number;
  sort_order: number;
  camera_setup: CameraSetup;
  director_notes: DirectorNotes;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoryboardSceneCast {
  id: string;
  company_id: string;
  scene_id: string;
  role_type: StoryboardCastRole;
  name: string;
  notes: string | null;
  created_at: string;
}

export interface StoryboardSceneEquipment {
  id: string;
  company_id: string;
  scene_id: string;
  equipment_id: string;
  created_at: string;
}

export interface Approval {
  id: string;
  company_id: string;
  project_id: string;
  episode_id: string;
  client_id: string | null;
  note: string | null;
  device_info: string | null;
  approved_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
}

export interface Invoice {
  id: string;
  company_id: string;
  project_id: string;
  client_id: string | null;
  number: string;
  issue_date: string;
  due_date: string | null;
  amount: number;
  tax: number;
  status: InvoiceStatus;
  pdf_url: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  company_id: string;
  invoice_id: string | null;
  project_id: string;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  status: PaymentStatus;
  method: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
  bank_account_id: string | null;
  reference_number: string | null;
  notes: string | null;
}

export interface Contract {
  id: string;
  company_id: string;
  project_id: string;
  client_id: string | null;
  title: string;
  content: Record<string, unknown>;
  amount: number | null;
  status: ContractStatus;
  version: number;
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  company_id: string;
  project_id: string | null;
  client_id: string | null;
  type: ProposalType;
  title: string;
  content: Record<string, unknown>;
  status: ProposalStatus;
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  company_id: string;
  project_id: string | null;
  title: string;
  amount: number;
  category: string | null;
  expense_date: string;
  created_by: string | null;
  created_at: string;
  vendor_id: string | null;
  category_id: string | null;
  attachment_url: string | null;
  payment_method: string | null;
}

export interface FinancialCategory {
  id: string;
  company_id: string;
  name: string;
  type: "income" | "expense";
  color: string;
  sort_order: number;
  created_at: string;
}

export interface Vendor {
  id: string;
  company_id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  category: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  company_id: string;
  name: string;
  bank_name: string | null;
  account_number: string | null;
  iban: string | null;
  currency: string;
  opening_balance: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type BankTransactionType = "deposit" | "withdrawal" | "transfer_in" | "transfer_out";

export interface BankTransaction {
  id: string;
  company_id: string;
  bank_account_id: string;
  type: BankTransactionType;
  amount: number;
  transaction_date: string;
  reference: string | null;
  description: string | null;
  related_payment_id: string | null;
  related_expense_id: string | null;
  reconciled: boolean;
  created_by: string | null;
  created_at: string;
}

export interface AppNotification {
  id: string;
  company_id: string | null;
  user_id: string;
  project_id: string | null;
  episode_id: string | null;
  type: string;
  title: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  company_id: string;
  project_id: string | null;
  episode_id: string | null;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface ClientPermissions {
  view_project: boolean;
  episodes: boolean;
  files: boolean;
  download_files: boolean;
  download_project: boolean;
  add_notes: boolean;
  reply_notes: boolean;
  approve_episodes: boolean;
  finance: boolean;
  payments: boolean;
  invoices: boolean;
  contracts: boolean;
  proposals: boolean;
  request_service: boolean;
  request_meeting: boolean;
  upload_attachments: boolean;
  execution_phases: boolean;
  script: boolean;
  scenario: boolean;
  storyboard: boolean;
}

export type ProjectClientStatus = "invited" | "active" | "disabled" | "revoked";

export type ClientAccessType = "unlimited" | "single_use" | "until_project_end" | "until_date";

export interface ProjectClient {
  id: string;
  company_id: string;
  project_id: string;
  client_id: string | null;
  client_user_id: string | null;
  invited_email: string;
  invite_token: string | null;
  status: ProjectClientStatus;
  permissions: ClientPermissions;
  invited_by: string | null;
  invited_at: string;
  activated_at: string | null;
  expires_at: string | null;
  access_type: ClientAccessType;
}

// بيانات معالج دعوة العميل الحرة (لا تحتاج أعمدة مستقلة) — تُحفظ وتُقرأ كما هي عند
// حفظ/استكمال مسودة، وتُستخدم أيضاً كشكل موحّد للحمولة المُرسلة لـ /api/invites/create.
export interface ClientInviteWizardData {
  phone?: string;
  jobTitle?: string;
  clientCompanyName?: string;
  inviteType: "view_only" | "review" | "client" | "manager" | "custom";
  permissions: ClientPermissions;
  durationDays: number | null; // null = دائم
  accessType: ClientAccessType;
  expiresAt?: string | null;
  deliveryMethod: "email" | "link" | "whatsapp" | "sms";
  senderId?: string | null;
  senderNumberId?: string | null;
}

export interface ClientInviteDraft {
  id: string;
  company_id: string;
  project_id: string;
  created_by: string | null;
  client_name: string;
  email: string;
  data: ClientInviteWizardData;
  created_at: string;
  updated_at: string;
}

// نسخة آمنة للعرض في الواجهة — بلا smtp_password إطلاقاً (لا تُعاد من أي API مطلقاً)
export interface CompanyEmailSenderPublic {
  id: string;
  company_id: string;
  label: string;
  from_name: string;
  from_email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_username: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanySenderNumber {
  id: string;
  company_id: string;
  label: string;
  phone_number: string;
  is_default: boolean;
  notes: string | null;
  created_at: string;
}

export type InvitationDeliveryMethod = "email" | "link" | "whatsapp" | "sms";
export type InvitationStatus = "pending" | "sent" | "failed" | "opened" | "accepted" | "expired" | "cancelled";

export interface Invitation {
  id: string;
  company_id: string;
  project_id: string;
  client_id: string | null;
  client_user_id: string | null;
  email: string;
  phone: string | null;
  delivery_method: InvitationDeliveryMethod;
  token: string;
  destination_url: string;
  status: InvitationStatus;
  error_message: string | null;
  retry_count: number;
  invited_by: string | null;
  sent_at: string | null;
  opened_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device: string | null;
  browser: string | null;
  created_at: string;
  updated_at: string;
}

// أبداً لا يشمل access_token — سرّ حقيقي، لا يُعاد للمتصفح إطلاقاً (نفس نمط
// CompanyEmailSenderPublic/smtp_password).
export interface CompanyWhatsappConfigPublic {
  id: string;
  company_id: string;
  label: string;
  phone_number_id: string;
  business_phone_display: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type EquipmentStatus = "available" | "in_use" | "maintenance";

export interface Equipment {
  id: string;
  company_id: string;
  name: string;
  category: string;
  quantity: number;
  status: EquipmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  project_type: string | null;
  is_active: boolean;
  stages: { key: string; label: string }[];
  services: { category: string; service_key: string; label: string }[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  theme: "dark" | "light";
  language: "ar" | "en";
  notifications_enabled: boolean;
  extra: Record<string, unknown>;
  updated_at: string;
}

export interface ProjectFavorite {
  id: string;
  company_id: string;
  project_id: string;
  user_id: string;
  created_at: string;
}

// ── Presentation Builder ──
export type PresentationTemplate =
  | "minimal"
  | "luxury"
  | "dark"
  | "corporate"
  | "creative"
  | "podcast"
  | "real_estate"
  | "agency"
  | "cinema"
  | "startup";

export interface PresentationSectionConfig {
  key: string;
  enabled: boolean;
}

// نصوص قابلة للتعديل خاصة بهذا المشروع تحديداً (تُبدَأ من presentation_defaults الشركة ثم تُعدَّل هنا)
export interface PresentationTexts extends PresentationDefaultTexts {
  project_message?: string;
  why_problem?: string;
  why_opportunity?: string;
  why_value?: string;
  objectives?: string[];
  audience?: string;
  creative_idea?: string;
  shooting_style?: string;
}

export interface ProjectPresentation {
  id: string;
  company_id: string;
  project_id: string;
  template: PresentationTemplate;
  sections: PresentationSectionConfig[];
  texts: PresentationTexts;
  share_token: string | null;
  share_enabled: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
