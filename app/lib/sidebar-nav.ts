import type { IconName } from "@/app/components/ui/Icon";

// هيكل التنقّل الجانبي — مصدر واحد يُستخدم في الـSidebar (Desktop) وDrawer الجوال معاً.
//
// ملاحظة صادقة: بعض العناصر المطلوبة أصلاً (Storyboard كصفحة مستقلة، مراحل التنفيذ كصفحة
// مستقلة، دعوات/صلاحيات العملاء كصفحة مستقلة، المهام/التذكيرات/التعليقات، تقارير الأداء/تقارير
// العملاء المنفصلة، إعدادات النسخ الاحتياطي/API/السجل) لا تقابلها صفحة حقيقية في النظام اليوم —
// هذه ميزات حقيقية بعضها (Storyboard، مراحل التنفيذ) لكنها تبويبات داخل صفحة الحلقة نفسها وليست
// مسارات مستقلة، وبعضها الآخر غير موجود إطلاقاً (لا نظام مهام عام، لا تكامل نسخ احتياطي/API).
// تم حذفها من القائمة بدل الإشارة لمسارات وهمية أو صفحات فارغة. "قنوات إرسال الدعوات" أدناه
// هي إعدادات بريد SMTP مخصص + أرقام مرجعية فقط — لا يوجد تكامل واتساب/SMS حقيقي في هذا النظام.
export interface SidebarLeaf {
  href: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
}

export type SidebarEntry =
  | ({ type: "link" } & SidebarLeaf)
  | { type: "group"; key: string; label: string; icon: IconName; items: SidebarLeaf[] };

export const SIDEBAR_NAV: SidebarEntry[] = [
  { type: "link", href: "/dashboard", label: "لوحة التحكم", icon: "dashboard" },
  {
    type: "group",
    key: "projects",
    label: "المشاريع",
    icon: "projects",
    items: [
      { href: "/projects", label: "جميع المشاريع", icon: "projects" },
      { href: "/episodes", label: "الحلقات", icon: "episodes" },
    ],
  },
  { type: "link", href: "/clients", label: "العملاء", icon: "clients" },
  { type: "link", href: "/announcements", label: "إعلان للعميل", icon: "megaphone" },
  // أُعيدت هيكلة قسم "المالية" السابق (14 عنصراً) إلى "الحسابات" ببنية مبسّطة من 6
  // عناصر فقط بناءً على طلب صريح — الحسابات البنكية/الموردون/التصنيفات المالية/
  // المستندات المالية لم تُحذف، بل انتقلت لتصبح روابط فرعية داخل صفحة "الإعدادات"
  // نفسها (accounts/settings) بدل عناصر مستقلة في القائمة الجانبية. العقود والعروض
  // والفواتير خرجت من هذه المجموعة إلى مجموعة "العقود والفواتير" المستقلة أدناه.
  {
    type: "group",
    key: "accounts",
    label: "الحسابات",
    icon: "finance",
    items: [
      { href: "/accounts", label: "حسابات المشاريع", icon: "barChart", adminOnly: true },
      { href: "/expenses", label: "المصروفات", icon: "expenses", adminOnly: true },
      { href: "/payments", label: "الإيرادات", icon: "money", adminOnly: true },
      { href: "/accounts/dues", label: "المستحقات", icon: "clock", adminOnly: true },
      { href: "/accounts/reports", label: "التقارير", icon: "export", adminOnly: true },
      { href: "/accounts/settings", label: "الإعدادات", icon: "settings", adminOnly: true },
    ],
  },
  {
    type: "group",
    key: "documents",
    label: "العقود والفواتير",
    icon: "contracts",
    items: [
      { href: "/contracts", label: "العقود", icon: "contracts", adminOnly: true },
      { href: "/proposals", label: "عروض الأسعار", icon: "proposals", adminOnly: true },
      { href: "/invoices", label: "الفواتير", icon: "invoices", adminOnly: true },
    ],
  },
  { type: "link", href: "/files", label: "الملفات", icon: "files" },
  { type: "link", href: "/notes", label: "الملاحظات", icon: "message" },
  { type: "link", href: "/export", label: "التقارير", icon: "export" },
  { type: "link", href: "/notifications", label: "الإشعارات", icon: "bell" },
  {
    type: "group",
    key: "settings",
    label: "الإعدادات",
    icon: "settings",
    items: [
      { href: "/account", label: "إعدادات الحساب", icon: "user" },
      { href: "/settings", label: "الشركة والهوية البصرية", icon: "company" },
      { href: "/settings/invite-channels", label: "قنوات إرسال الدعوات", icon: "mail", adminOnly: true },
      { href: "/settings/invitations", label: "سجل الدعوات", icon: "clock", adminOnly: true },
      { href: "/team", label: "الفريق والصلاحيات", icon: "team", adminOnly: true },
      { href: "/equipment", label: "المعدات", icon: "equipment" },
      { href: "/templates", label: "القوالب", icon: "templates" },
    ],
  },
];

export function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
