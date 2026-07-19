import type { ProjectTemplateDefinition } from "./types";
import { getMetaTags, getMetaValue } from "@/app/lib/episode-meta";

// قالب الريلز — بطاقة رأسية 9:16، حقول Hook/هاشتاق/موسيقى/منصة مخزَّنة في
// episodes.meta، بلا ستوري بورد/سكربت (المحتوى قصير وسريع، لا يحتاج تلك الأدوات).
// يُفعَّل فعلياً في سجل القوالب (registry.ts) عند بدء المرحلة 2.
export const REELS_TEMPLATE: ProjectTemplateDefinition = {
  key: "reels",
  label: "ريلز",
  defaultItemNounKey: "custom",
  defaultItemNounCustom: { singular: "ريل", plural: "ريلز" },
  cardVariant: "vertical",
  tabs: ["overview", "stages", "meta", "files", "notes", "activity"],
  defaultStages: [
    { key: "idea", label: "الفكرة" },
    { key: "script", label: "كتابة النص" },
    { key: "hook", label: "الـ Hook" },
    { key: "shooting", label: "التصوير" },
    { key: "editing", label: "المونتاج" },
    { key: "review", label: "المراجعة" },
    { key: "publish", label: "النشر" },
  ],
  metaFields: [
    { key: "idea", label: "الفكرة", type: "textarea" },
    { key: "hook", label: "الـ Hook", type: "textarea", placeholder: "أول 3 ثوانٍ..." },
    { key: "caption", label: "الكابشن", type: "textarea" },
    { key: "hashtags", label: "الهاشتاقات", type: "tags", icon: "hash" },
    { key: "music", label: "الموسيقى/الصوت", type: "text", icon: "music" },
    {
      key: "platform",
      label: "المنصة",
      type: "select",
      icon: "sparkles",
      options: [
        { value: "instagram", label: "Instagram" },
        { value: "tiktok", label: "TikTok" },
        { value: "youtube_shorts", label: "YouTube Shorts" },
        { value: "snapchat", label: "Snapchat" },
      ],
    },
  ],
  statCards: [
    { key: "count", label: (itemNounPlural) => itemNounPlural, icon: "video", compute: (g) => g.length },
    {
      key: "avgProgress",
      label: "متوسط الإنجاز",
      icon: "barChart",
      compute: (g) => `${g.length ? Math.round(g.reduce((s, e) => s + e.progress, 0) / g.length) : 0}%`,
    },
    { key: "published", label: "منشورة", icon: "badgeCheck", compute: (g) => g.filter((e) => e.pipeline_stage === "publish" || e.hasActiveApproval).length },
    { key: "files", label: "الملفات", icon: "attachment", compute: (g) => g.reduce((s, e) => s + e.filesCount, 0) },
    { key: "notes", label: "الملاحظات", icon: "message", compute: (g) => g.reduce((s, e) => s + e.notesCount + e.commentsCount, 0) },
  ],
  clientStatCards: [
    { key: "count", label: (p) => `إجمالي ${p}`, icon: "episodes", color: "var(--gold)", compute: (e) => e.length },
    { key: "completed", label: "منشورة", icon: "checkCircle", color: "var(--success)", compute: (e) => e.filter((x) => x.status === "delivered" || x.status === "approved").length },
    { key: "inProgress", label: "قيد التنفيذ", icon: "clock", color: "#F59E0B", compute: (e) => e.filter((x) => x.status === "in_progress" || x.status === "in_review" || x.status === "ready_for_approval").length },
    {
      key: "remaining",
      label: "متبقية",
      icon: "circle",
      color: "#6B7280",
      compute: (e) => e.length - e.filter((x) => x.status === "delivered" || x.status === "approved").length,
    },
  ],
  showDurationBadge: true,
};

// دوال مساعدة مُصدَّرة لمكوّنات البطاقة/التفاصيل — تقرأ حقول meta الخاصة بريلز
// بأمان (انظر app/lib/episode-meta.ts للتنفيذ العام).
export function getReelHook(meta: Record<string, unknown> | null | undefined) {
  return getMetaValue(meta, "hook");
}
export function getReelHashtags(meta: Record<string, unknown> | null | undefined) {
  return getMetaTags(meta, "hashtags");
}
