import { PODCAST_TEMPLATE } from "./podcast";
import type { ProjectTemplateDefinition, TemplateKey } from "./types";

// سجل القوالب المُفعَّلة فعلياً — "reels"/"brand_identity" مبنيان بالكامل
// (reels.ts/brand-identity.ts) لكنهما يُضافان هنا فقط عند بدء مرحلتيهما
// (المرحلة 2/3) بعد بناء بطاقاتهما (VerticalCard/DeliverableCard)، حتى لا يرث
// أي مشروع بذلك النوع سلوكاً جزئياً غير مكتمل الاختبار في المرحلة الأولى.
export const TEMPLATE_REGISTRY: Partial<Record<TemplateKey, ProjectTemplateDefinition>> = {
  podcast: PODCAST_TEMPLATE,
};

// أي project.type غير مسجَّل صراحة (null، قيمة قديمة، "other"، أو أحد الأنواع
// التي لم تُفعَّل بعد) يُحل تلقائياً لقالب "podcast" — وهو مطابق حرفياً للسلوك
// الحالي، فلا يوجد أي فارق سلوكي على أي مشروع قائم أو أي نوع لم يُفعَّل له قالب بعد.
export function resolveTemplate(projectType: string | null | undefined): ProjectTemplateDefinition {
  if (projectType && projectType in TEMPLATE_REGISTRY) {
    return TEMPLATE_REGISTRY[projectType as TemplateKey]!;
  }
  return PODCAST_TEMPLATE;
}
