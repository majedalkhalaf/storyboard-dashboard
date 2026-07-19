import { PODCAST_TEMPLATE } from "./podcast";
import { BRAND_IDENTITY_TEMPLATE } from "./brand-identity";
import type { ProjectTemplateDefinition, TemplateKey } from "./types";

// سجل القوالب المُفعَّلة فعلياً — "reels" مبني بالكامل (reels.ts) لكنه يُضاف هنا
// فقط عند بدء مرحلته (المرحلة 2) بعد بناء بطاقته (VerticalCard)، حتى لا يرث أي
// مشروع بهذا النوع سلوكاً جزئياً غير مكتمل الاختبار.
export const TEMPLATE_REGISTRY: Partial<Record<TemplateKey, ProjectTemplateDefinition>> = {
  podcast: PODCAST_TEMPLATE,
  brand_identity: BRAND_IDENTITY_TEMPLATE,
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
