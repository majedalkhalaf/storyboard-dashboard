import type { PresentationData } from "@/app/lib/presentation-sections";
import type { PresentationTexts } from "@/app/lib/types";

// مولّد نصوص تسويقية ذكية بالكامل من بيانات المشروع الفعلية — بلا أي اعتماد على
// نموذج ذكاء اصطناعي خارجي (قرار المستخدم صراحةً: قوالب ذكية بلا تكلفة تشغيل).
// يُستدعى مرة واحدة فقط عند إنشاء أول عرض فني لمشروع معيّن (loadPresentationBundle)
// لملء الحقول المشروع-محورية (بخلاف نصوص الشركة العامة القادمة من
// company.presentation_defaults) — القالب يستخدم صيغة **كلمة** (راجع
// presentation-highlight.tsx) لتمييز الكلمات المفتاحية بلون الهوية تلقائياً.

function serviceLabels(data: PresentationData): string[] {
  return data.services.map((s) => s.label).filter(Boolean);
}

function joinArabicList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join("، ")} و${items[items.length - 1]}`;
}

export function generateSmartPresentationTexts(data: PresentationData): Partial<PresentationTexts> {
  const services = serviceLabels(data);
  const servicesText = services.length > 0 ? joinArabicList(services) : "إنتاج محتوى إعلامي احترافي";
  const episodeCount = data.episodes.length;
  const hasDescription = Boolean(data.projectDescription?.trim());
  const companyName = data.companyName || "فريق العمل";
  const clientOrProject = data.clientName || data.projectName;

  const project_message = [
    `يسرّ **${companyName}** أن يقدّم لكم هذا العرض المتكامل لمشروع **${data.projectName}**.`,
    hasDescription ? data.projectDescription! : `يغطّي هذا المشروع **${servicesText}** بمعايير إنتاج احترافية.`,
    episodeCount > 0 ? `ويتضمّن العرض **${episodeCount}** ${episodeCount === 1 ? "عنصراً إنتاجياً" : "عناصر إنتاجية"} متكاملة.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const why_problem = hasDescription
    ? `تحتاج **${clientOrProject}** إلى محتوى مرئي يعكس تميّزها الفعلي، بعيداً عن الحلول الجاهزة التي لا تعبّر عن هويتها الحقيقية.`
    : `الكثير من العلامات تفتقر إلى محتوى مرئي احترافي يعكس قيمتها الحقيقية أمام جمهورها المستهدف.`;

  const why_opportunity = `من خلال **${servicesText}**، نحوّل هذه الفكرة إلى محتوى ملموس يصل لجمهور **${clientOrProject}** بأسلوب احترافي ومؤثر.`;

  const why_value = `النتيجة: محتوى بجودة إنتاجية عالية يعزّز حضور **${clientOrProject}** ويحقّق أثراً حقيقياً وقابلاً للقياس.`;

  const audience = data.clientName
    ? `جمهور علامة **${data.clientName}** الحالي والمرتقب، عبر منصّات العرض الرقمية والتقليدية المناسبة لطبيعة المحتوى.`
    : `الجمهور المستهدف لمشروع **${data.projectName}** عبر منصّات العرض الرقمية والتقليدية.`;

  const episodeTitles = data.episodes
    .slice(0, 3)
    .map((e) => e.title)
    .filter(Boolean);
  const creative_idea = [
    hasDescription ? data.projectDescription! : `فكرة **${data.projectName}** الإبداعية مبنية على أسلوب سردي بصري متكامل يخدم أهداف المشروع.`,
    episodeTitles.length > 0 ? `من أبرز محاور المحتوى: **${joinArabicList(episodeTitles)}**.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const shooting_style =
    data.locations.length > 0
      ? `تصوير احترافي متعدد المواقع (**${joinArabicList(data.locations.slice(0, 3))}**)، بمعدات وتقنيات تواكب أعلى معايير الجودة البصرية.`
      : `أسلوب تصوير سينمائي احترافي، بإضاءة وتكوين بصري مدروس يعكس الهوية البصرية لـ**${companyName}**.`;

  const objectives = [
    episodeCount > 0
      ? `إنتاج **${episodeCount}** ${episodeCount === 1 ? "عنصر إنتاجي" : "عناصر إنتاجية"} بجودة احترافية عالية`
      : "إنتاج محتوى مرئي احترافي متكامل",
    services.length > 0 ? `تغطية **${servicesText}** بأعلى معايير الجودة` : "",
    data.deliveryDate ? "الالتزام بموعد التسليم النهائي المتّفق عليه" : "",
  ].filter(Boolean);

  return { project_message, why_problem, why_opportunity, why_value, audience, creative_idea, shooting_style, objectives };
}
