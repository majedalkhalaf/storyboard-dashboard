import type { BookletData } from "@/app/lib/booklet-sections";
import type { BookletTexts } from "@/app/lib/types";

// مولّد نصوص تسويقية-ختامية ذكي (بلا ذكاء اصطناعي خارجي، نفس قرار presentation-copywriter.ts)
// خاص بحقول الكتيّب الرجعية-المحور (بعد انتهاء المشروع): رسالة تسليم، ملخص إنجازات،
// رسالة ختامية. أما نصوص الشركة العامة (نبذة/قيم/رؤية/كلمة المدير) فتُؤخذ مباشرة من
// company.presentation_defaults عند إنشاء أول كتيّب (نفس مصدر العرض الفني، لا تكرار).

function joinArabicList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join("، ")} و${items[items.length - 1]}`;
}

function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} ${hours === 1 ? "ساعة" : "ساعات"}${minutes > 0 ? ` و${minutes} دقيقة` : ""}`;
  return `${minutes} دقيقة`;
}

export function generateSmartBookletTexts(data: BookletData): Partial<BookletTexts> {
  const companyName = data.companyName || "فريقنا";
  const clientOrProject = data.clientName || data.projectName;
  const services = data.services.map((s) => s.label).filter(Boolean);
  const servicesText = services.length > 0 ? joinArabicList(services) : "الخدمات المتفق عليها";
  const durationText = formatDuration(data.totalDurationSeconds);

  const handover_message = [
    `يسعد **${companyName}** أن يسلّم لكم هذا الكتيّب التوثيقي الشامل لمشروع **${data.projectName}**،`,
    `يوثّق رحلة العمل الكاملة من الفكرة الأولى وحتى التسليم النهائي.`,
    data.daysElapsed ? `استغرق تنفيذ المشروع **${data.daysElapsed}** ${data.daysElapsed === 1 ? "يوماً" : "يوماً"} من العمل المتواصل.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const achievementsParts = [
    data.totalEpisodes > 0
      ? `تم إنجاز **${data.completedEpisodes}** من أصل **${data.totalEpisodes}** ${data.totalEpisodes === 1 ? "عنصر إنتاجي" : "عناصر إنتاجية"}`
      : "",
    durationText ? `بإجمالي محتوى مرئي يتجاوز **${durationText}**` : "",
    data.totalFiles > 0 ? `و**${data.totalFiles}** ملفاً ومخرجاً نهائياً` : "",
  ].filter(Boolean);
  const achievements_summary =
    achievementsParts.length > 0
      ? `${achievementsParts.join("، ")}، تغطّي **${servicesText}** لصالح **${clientOrProject}**.`
      : `مشروع **${data.projectName}** أُنجز بالكامل وفق **${servicesText}** لصالح **${clientOrProject}**.`;

  const closing_message = `شكراً لثقة **${clientOrProject}** بـ**${companyName}** طوال هذه الرحلة، ونتطلّع لمزيد من التعاون في مشاريع قادمة.`;

  return { handover_message, achievements_summary, closing_message };
}
