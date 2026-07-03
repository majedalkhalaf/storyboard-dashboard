import type { IconName } from "@/app/components/ui/Icon";

// هيكل التنقّل الجانبي — مصدر واحد يُستخدم في الـSidebar (Desktop) وDrawer الجوال معاً.
//
// ملاحظة صادقة: بعض العناصر المطلوبة أصلاً (Storyboard كصفحة مستقلة، مراحل التنفيذ كصفحة
// مستقلة، دعوات/صلاحيات العملاء كصفحة مستقلة، المهام/التذكيرات/التعليقات، تقارير الأداء/تقارير
// العملاء المنفصلة، إعدادات البريد/واتساب/النسخ الاحتياطي/API/السجل) لا تقابلها صفحة حقيقية في
// النظام اليوم — هذه ميزات حقيقية بعضها (Storyboard، مراحل التنفيذ) لكنها تبويبات داخل صفحة
// الحلقة نفسها وليست مسارات مستقلة، وبعضها الآخر غير موجود إطلاقاً (لا نظام مهام عام، لا تكامل
// بريد/واتساب/نسخ احتياطي/API). تم حذفها من القائمة بدل الإشارة لمسارات وهمية أو صفحات فارغة.
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
  {
    type: "group",
    key: "finance",
    label: "المالية",
    icon: "finance",
    items: [
      { href: "/finance", label: "لوحة المالية", icon: "barChart", adminOnly: true },
      { href: "/finance/projects", label: "المشاريع المالية", icon: "projects", adminOnly: true },
      { href: "/contracts", label: "العقود المالية", icon: "contracts", adminOnly: true },
      { href: "/proposals", label: "عروض الأسعار", icon: "proposals", adminOnly: true },
      { href: "/invoices", label: "الفواتير", icon: "invoices", adminOnly: true },
      { href: "/payments", label: "الدفعات", icon: "payments", adminOnly: true },
      { href: "/expenses", label: "المصروفات", icon: "expenses", adminOnly: true },
      { href: "/finance/dues", label: "المستحقات", icon: "clock", adminOnly: true },
      { href: "/finance/bank-accounts", label: "الحسابات البنكية", icon: "storage", adminOnly: true },
      { href: "/finance/vendors", label: "الموردون", icon: "clients", adminOnly: true },
      { href: "/finance/categories", label: "التصنيفات المالية", icon: "sliders", adminOnly: true },
      { href: "/finance/reports", label: "التقارير المالية", icon: "export", adminOnly: true },
      { href: "/finance/documents", label: "المستندات المالية", icon: "files", adminOnly: true },
      { href: "/finance/settings", label: "الإعدادات المالية", icon: "settings", adminOnly: true },
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
      { href: "/team", label: "الفريق والصلاحيات", icon: "team", adminOnly: true },
      { href: "/equipment", label: "المعدات", icon: "equipment" },
      { href: "/templates", label: "القوالب", icon: "templates" },
    ],
  },
];

export function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
