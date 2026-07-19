import type { ProjectTemplateDefinition } from "./types";

// قالب الهوية البصرية — العناصر هنا ليست "حلقات" بل تسليمات (شعار/ألوان/خطوط/
// بطاقة عمل/سوشيال ميديا/تغليف/دليل الهوية)، بطاقة ثقيلة بأنواع ملفات
// (AI/PSD/PDF/PNG/SVG) بدل شارة مدة فيديو. يُفعَّل فعلياً في سجل القوالب
// (registry.ts) عند بدء المرحلة 3.
export const BRAND_IDENTITY_TEMPLATE: ProjectTemplateDefinition = {
  key: "brand_identity",
  label: "هوية بصرية",
  defaultItemNounKey: "custom",
  defaultItemNounCustom: { singular: "تسليمة", plural: "تسليمات" },
  cardVariant: "deliverable",
  tabs: ["overview", "stages", "files", "notes", "activity"],
  defaultStages: [
    { key: "research", label: "البحث" },
    { key: "moodboard", label: "Moodboard" },
    { key: "sketch", label: "السكتش" },
    { key: "concept", label: "المفهوم" },
    { key: "design", label: "التصميم" },
    { key: "revision", label: "التعديلات" },
    { key: "approval", label: "الاعتماد" },
    { key: "export", label: "التصدير" },
  ],
  metaFields: [
    {
      key: "deliverable_type",
      label: "نوع التسليمة",
      type: "select",
      options: [
        { value: "logo", label: "شعار" },
        { value: "colors", label: "الألوان" },
        { value: "typography", label: "الخطوط" },
        { value: "business_card", label: "بطاقة عمل" },
        { value: "social_media", label: "قوالب سوشيال ميديا" },
        { value: "packaging", label: "تغليف" },
        { value: "brand_guidelines", label: "دليل الهوية" },
        { value: "other", label: "أخرى" },
      ],
    },
  ],
  fileTypeChips: [
    { ext: "ai", label: "AI", icon: "layers" },
    { ext: "psd", label: "PSD", icon: "image" },
    { ext: "pdf", label: "PDF", icon: "fileCheck" },
    { ext: "png", label: "PNG", icon: "image" },
    { ext: "svg", label: "SVG", icon: "vector" },
  ],
  statCards: [
    { key: "count", label: (itemNounPlural) => itemNounPlural, icon: "layers", compute: (g) => g.length },
    {
      key: "avgProgress",
      label: "متوسط الإنجاز",
      icon: "barChart",
      compute: (g) => `${g.length ? Math.round(g.reduce((s, e) => s + e.progress, 0) / g.length) : 0}%`,
    },
    { key: "approved", label: "تسليمات معتمدة", icon: "badgeCheck", compute: (g) => g.filter((e) => e.hasActiveApproval).length },
    { key: "files", label: "الملفات المصدَّرة", icon: "attachment", compute: (g) => g.reduce((s, e) => s + e.filesCount, 0) },
    { key: "notes", label: "الملاحظات", icon: "message", compute: (g) => g.reduce((s, e) => s + e.notesCount + e.commentsCount, 0) },
  ],
  clientStatCards: [
    { key: "count", label: (p) => `إجمالي ${p}`, icon: "layers", color: "var(--gold)", compute: (e) => e.length },
    { key: "completed", label: "تسليمات معتمدة", icon: "checkCircle", color: "var(--success)", compute: (e) => e.filter((x) => x.status === "delivered" || x.status === "approved").length },
    { key: "inProgress", label: "قيد التنفيذ", icon: "clock", color: "#F59E0B", compute: (e) => e.filter((x) => x.status === "in_progress" || x.status === "in_review" || x.status === "ready_for_approval").length },
    {
      key: "remaining",
      label: "متبقية",
      icon: "circle",
      color: "#6B7280",
      compute: (e) => e.length - e.filter((x) => x.status === "delivered" || x.status === "approved").length,
    },
  ],
  showDurationBadge: false,
};
