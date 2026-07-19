import { DEFAULT_EPISODE_STAGES } from "@/app/lib/constants";
import type { ProjectTemplateDefinition } from "./types";

// القالب الأساسي — يجب أن يطابق سلوك النظام الحالي (قبل نظام القوالب) حرفياً؛
// هو "الحالة الافتراضية" التي يتراجع إليها resolveTemplate() لأي نوع مشروع غير
// مسجَّل صراحة (null، قيمة قديمة، "other"، أو نوع لم يُبنَ له قالب مخصص بعد).
export const PODCAST_TEMPLATE: ProjectTemplateDefinition = {
  key: "podcast",
  label: "بودكاست",
  defaultItemNounKey: "episodes",
  cardVariant: "standard",
  tabs: ["overview", "stages", "files", "notes", "storyboard", "script", "episode_bts", "episode_progress", "activity"],
  defaultStages: DEFAULT_EPISODE_STAGES,
  metaFields: [],
  statCards: [
    { key: "count", label: (itemNounPlural) => itemNounPlural, icon: "video", compute: (g) => g.length },
    {
      key: "avgProgress",
      label: "متوسط الإنجاز",
      icon: "barChart",
      compute: (g) => `${g.length ? Math.round(g.reduce((s, e) => s + e.progress, 0) / g.length) : 0}%`,
    },
    { key: "approved", label: "حلقات معتمدة", icon: "badgeCheck", compute: (g) => g.filter((e) => e.hasActiveApproval).length },
    { key: "files", label: "الملفات", icon: "attachment", compute: (g) => g.reduce((s, e) => s + e.filesCount, 0) },
    { key: "notes", label: "الملاحظات", icon: "message", compute: (g) => g.reduce((s, e) => s + e.notesCount + e.commentsCount, 0) },
  ],
  clientStatCards: [
    { key: "count", label: (p) => `إجمالي ${p}`, icon: "episodes", color: "var(--gold)", compute: (e) => e.length },
    { key: "completed", label: "حلقات مكتملة", icon: "checkCircle", color: "var(--success)", compute: (e) => e.filter((x) => x.status === "delivered" || x.status === "approved").length },
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
