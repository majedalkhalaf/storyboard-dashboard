import type { IconName } from "@/app/components/ui/Icon";
import type { ClientAccessType, ClientPermissions } from "@/app/lib/types";
import { DEFAULT_CLIENT_PERMISSIONS, CLIENT_PERMISSION_LABELS } from "@/app/lib/constants";

// كتالوج صلاحيات معالج دعوة العميل — مصدر واحد يغذّي كلاً من نافذة الدعوة (Wizard)
// وأي عرض آخر لصلاحيات العميل. يعتمد حصراً على مفاتيح ClientPermissions الـ20
// الموجودة فعلياً والمُطبَّقة في بوابة العميل (راجع canClient() في مكوّنات app/client
// وapp/components/client) — لم تُضَف صلاحيات جديدة لا يوجد خلفها أي ميزة حقيقية.
//
// ملاحظة صادقة: مجموعة "التقارير" (مشاهدة تقارير/تصدير PDF أو Excel/تصدير المشروع)
// المطلوبة في التصميم المرجعي لا تقابلها أي ميزة فعلية في بوابة العميل اليوم (لا يوجد
// تبويب تقارير للعميل ولا تصدير)، فحُذفت من الكتالوج بدل إضافة صلاحيات وهمية. كذلك
// request_service وrequest_meeting موجودتان في المخطط منذ قبل هذه الجلسة كصلاحيات
// معلنة، لكن لا توجد بعد واجهة فعلية في بوابة العميل لتقديم طلب خدمة/اجتماع — أُبقيتا
// في الكتالوج لأنهما جزء من المخطط الحالي أصلاً، مع الإفصاح عن هذا في ملخص التسليم.
export interface ClientPermissionGroup {
  key: string;
  label: string;
  icon: IconName;
  keys: (keyof ClientPermissions)[];
}

export const CLIENT_PERMISSION_GROUPS: ClientPermissionGroup[] = [
  { key: "project_contracts", label: "المشاريع والعقود", icon: "projects", keys: ["view_project", "contracts", "download_project"] },
  { key: "files", label: "الملفات والمرفقات", icon: "files", keys: ["files", "download_files", "upload_attachments"] },
  {
    key: "production",
    label: "الحلقات والإنتاج",
    icon: "episodes",
    keys: ["episodes", "approve_episodes", "execution_phases", "script", "scenario", "storyboard", "add_notes", "reply_notes"],
  },
  { key: "finance", label: "المالية", icon: "finance", keys: ["finance", "payments", "invoices", "proposals"] },
  { key: "services", label: "الخدمات", icon: "calendar", keys: ["request_service", "request_meeting"] },
];

export type ClientInviteType = "view_only" | "review" | "client" | "manager" | "custom";

export const CLIENT_INVITE_TYPES: { value: ClientInviteType; label: string; description: string; icon: IconName }[] = [
  { value: "view_only", label: "مشاهدة فقط", description: "يشاهد العميل المحتوى المسموح به فقط، دون أي تفاعل", icon: "eye" },
  { value: "review", label: "مراجعة", description: "يشاهد المحتوى ويضيف الملاحظات فقط", icon: "user" },
  { value: "client", label: "مراجعة واعتماد", description: "يشاهد المحتوى، يضيف الملاحظات، ويعتمد الحلقات والملفات المرسلة له", icon: "userPlus" },
  { value: "manager", label: "عميل كامل الصلاحيات", description: "يحصل على جميع الصلاحيات المسموح بها للعميل", icon: "sliders" },
  { value: "custom", label: "مخصص", description: "تُختار يدوياً من القائمة أدناه", icon: "settings" },
];

const ALL_KEYS = Object.keys(CLIENT_PERMISSION_LABELS) as (keyof ClientPermissions)[];

function allTrue(): ClientPermissions {
  const p = {} as ClientPermissions;
  for (const k of ALL_KEYS) p[k] = true;
  return p;
}

function viewOnly(): ClientPermissions {
  const p = {} as ClientPermissions;
  for (const k of ALL_KEYS) p[k] = false;
  p.view_project = true;
  p.episodes = true;
  p.files = true;
  return p;
}

function review(): ClientPermissions {
  return { ...viewOnly(), add_notes: true, reply_notes: true };
}

export const CLIENT_INVITE_PRESETS: Record<Exclude<ClientInviteType, "custom">, ClientPermissions> = {
  view_only: viewOnly(),
  review: review(),
  client: { ...DEFAULT_CLIENT_PERMISSIONS },
  manager: allTrue(),
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

export function detectInviteType(permissions: ClientPermissions): ClientInviteType {
  for (const [type, preset] of Object.entries(CLIENT_INVITE_PRESETS) as [Exclude<ClientInviteType, "custom">, ClientPermissions][]) {
    if (ALL_KEYS.every((k) => permissions[k] === preset[k])) return type;
  }
  return "custom";
}
