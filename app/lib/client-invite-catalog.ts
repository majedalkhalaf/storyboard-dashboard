import type { IconName } from "@/app/components/ui/Icon";
import type { ClientAccessType, ClientPermissions } from "@/app/lib/types";
import { DEFAULT_CLIENT_PERMISSIONS, CLIENT_PERMISSION_LABELS } from "@/app/lib/constants";

// كتالوج صلاحيات العميل — مصدر واحد يغذّي نافذة الدعوة ومحرر صلاحيات العميل
// الحالي في تبويب "العملاء" سواء بسواء، بحيث لا يوجد نموذجان مختلفان لنفس
// المفهوم. مقسّم إلى مجموعات مواضيعية بدل قائمة مسطّحة طويلة، مع ستة قوالب
// جاهزة (خمسة مواقف + مخصّص) تُطبَّق بضغطة واحدة ويمكن تعديلها بعدها يدوياً.
//
// ملاحظة صادقة: كل مفتاح هنا يقابله فعلياً بوابة صلاحية حقيقية أو حقل بيانات
// حقيقي في بوابة العميل — لا توجد مفاتيح صلاحيات لميزات غير موجودة أصلاً (مثل
// "الأرباح" أو "تعديل/حذف طلب تعديل بعد إرساله" أو إخفاء أسماء أعضاء الفريق
// الداخلي تحديداً — تلك الأخيرة مُخفاة دائماً وبلا استثناء عن العميل في كل
// مكان أصلاً، فلا حاجة لمفتاح صلاحية إضافي لها).
export interface ClientPermissionGroup {
  key: string;
  label: string;
  icon: IconName;
  keys: (keyof ClientPermissions)[];
}

export const CLIENT_PERMISSION_GROUPS: ClientPermissionGroup[] = [
  { key: "general", label: "الوصول العام", icon: "eye", keys: ["view_project", "show_project_value", "show_delivery_date"] },
  { key: "episodes", label: "الحلقات ومراحل التنفيذ", icon: "episodes", keys: ["episodes", "execution_phases", "script", "scenario", "storyboard"] },
  { key: "files", label: "الملفات والوسائط", icon: "files", keys: ["files", "download_files", "download_episode_zip", "download_project", "upload_attachments"] },
  { key: "requests", label: "طلبات التعديل", icon: "edit", keys: ["add_notes", "reply_notes"] },
  { key: "approvals", label: "الاعتماد", icon: "checkCircle", keys: ["approve_episodes"] },
  { key: "behind_scenes", label: "الكواليس", icon: "sparkles", keys: ["bts_view", "bts_comment"] },
  { key: "progress", label: "العمل الجاري", icon: "timeline", keys: ["progress_view"] },
  { key: "finance", label: "المالية والمستندات", icon: "finance", keys: ["finance", "payments", "invoices", "contracts", "proposals"] },
  { key: "meetings_support", label: "الاجتماعات والدعم", icon: "calendar", keys: ["request_meeting", "view_support"] },
  { key: "reports", label: "التقارير", icon: "barChart", keys: ["view_reports"] },
];

export type ClientInviteType = "view_only" | "regular" | "premium" | "manager" | "full" | "custom";

export const CLIENT_INVITE_TYPES: { value: ClientInviteType; label: string; description: string; icon: IconName }[] = [
  { value: "view_only", label: "مشاهدة فقط", description: "يشاهد العميل المحتوى المسموح به فقط، دون أي إضافة أو تفاعل", icon: "eye" },
  { value: "regular", label: "عميل عادي", description: "يشاهد المحتوى، يرسل طلبات تعديل، ويعتمد الحلقات — الإعدادات الافتراضية المتوازنة", icon: "user" },
  { value: "premium", label: "عميل مميز", description: "كل صلاحيات العميل العادي، بالإضافة إلى المالية والفواتير وتحميل المشروع كاملاً والتعليق على الكواليس", icon: "star" },
  { value: "manager", label: "مدير من جهة العميل", description: "صلاحيات واسعة تشمل العقود والعروض ومراحل التنفيذ والسكربت، فوق كل صلاحيات العميل المميز", icon: "userPlus" },
  { value: "full", label: "صلاحيات كاملة", description: "كل صلاحية في النظام مفعّلة دون استثناء", icon: "sliders" },
  { value: "custom", label: "صلاحيات مخصصة", description: "تُختار يدوياً كل صلاحية على حدة من القائمة أدناه", icon: "settings" },
];

const ALL_KEYS = Object.keys(CLIENT_PERMISSION_LABELS) as (keyof ClientPermissions)[];

function allTrue(): ClientPermissions {
  const p = {} as ClientPermissions;
  for (const k of ALL_KEYS) p[k] = true;
  return p;
}

function allFalse(): ClientPermissions {
  const p = {} as ClientPermissions;
  for (const k of ALL_KEYS) p[k] = false;
  return p;
}

function viewOnly(): ClientPermissions {
  return {
    ...allFalse(),
    view_project: true,
    episodes: true,
    files: true,
    bts_view: true,
    progress_view: true,
    view_reports: true,
    view_support: true,
    show_project_value: true,
    show_delivery_date: true,
  };
}

function premium(): ClientPermissions {
  return {
    ...DEFAULT_CLIENT_PERMISSIONS,
    finance: true,
    payments: true,
    download_project: true,
    bts_comment: true,
  };
}

function managerPreset(): ClientPermissions {
  return {
    ...premium(),
    contracts: true,
    proposals: true,
    execution_phases: true,
    script: true,
    scenario: true,
    storyboard: true,
  };
}

export const CLIENT_INVITE_PRESETS: Record<Exclude<ClientInviteType, "custom">, ClientPermissions> = {
  view_only: viewOnly(),
  regular: { ...DEFAULT_CLIENT_PERMISSIONS },
  premium: premium(),
  manager: managerPreset(),
  full: allTrue(),
};

export interface ClientInviteDurationOption {
  value: number | null; // بالأيام — null يعني دائم
  label: string;
}

export const CLIENT_INVITE_DURATIONS: ClientInviteDurationOption[] = [
  { value: 30, label: "30 يوم" },
  { value: 90, label: "90 يوم" },
  { value: 182, label: "6 أشهر" },
  { value: 365, label: "سنة" },
  { value: null, label: "دائم" },
];

export const CLIENT_ACCESS_TYPES: { value: ClientAccessType; label: string }[] = [
  { value: "unlimited", label: "غير محدود" },
  { value: "single_use", label: "مرة واحدة" },
  { value: "until_project_end", label: "حتى انتهاء المشروع" },
  { value: "until_date", label: "حتى تاريخ محدد" },
];

export type ClientDeliveryMethod = "email" | "link" | "whatsapp" | "sms";

// "واتساب": إن أعدّت الشركة بيانات Meta WhatsApp Cloud API حقيقية (إعدادات > قنوات
// إرسال الدعوات) يُرسل تلقائياً فعلياً عبر Graph API الرسمي. بلا ذلك، يبقى حلاً يدوياً
// (حساب بكلمة مرور مؤقتة + رابط wa.me جاهز يفتحه المستخدم بنفسه) — الحالتان مفصح
// عنهما بوضوح في شاشة النجاح. "SMS": لا يوجد مزوّد SMS معتمد بعد، فهي دائماً قناة
// يدوية (حساب + كلمة مرور مؤقتة + رسالة جاهزة تُنسخ يدوياً)، وليست ادّعاء إرسال تلقائي.
export const CLIENT_DELIVERY_METHODS: { value: ClientDeliveryMethod; label: string; description: string; icon: IconName }[] = [
  { value: "email", label: "البريد الإلكتروني", description: "يُرسل بريد دعوة حقيقي فوراً عبر الشركة أو Supabase", icon: "mail" },
  { value: "whatsapp", label: "واتساب", description: "إرسال تلقائي حقيقي إن أُعِدّ واتساب بزنس API، أو رابط جاهز يدوياً", icon: "phone" },
  { value: "sms", label: "رسالة نصية (SMS)", description: "حساب بكلمة مرور مؤقتة + رسالة جاهزة تُنسخ يدوياً", icon: "message" },
  { value: "link", label: "نسخ الرابط", description: "لإرساله يدوياً عبر أي قناة أخرى", icon: "link" },
];

export function permissionCountOf(permissions: ClientPermissions): number {
  return ALL_KEYS.filter((k) => permissions[k]).length;
}

export function permissionTotalCount(): number {
  return ALL_KEYS.length;
}

export function detectInviteType(permissions: ClientPermissions): ClientInviteType {
  for (const [type, preset] of Object.entries(CLIENT_INVITE_PRESETS) as [Exclude<ClientInviteType, "custom">, ClientPermissions][]) {
    if (ALL_KEYS.every((k) => permissions[k] === preset[k])) return type;
  }
  return "custom";
}
