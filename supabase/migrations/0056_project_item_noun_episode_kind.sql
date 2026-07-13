-- ══════════════════════════════════════════════════════════════════════════
-- تسمية عنصر المشروع (حلقات/فيديوهات إعلانية/عناصر/تسمية مخصّصة) بدل الاسم
-- الثابت "حلقة/حلقات" في كل الواجهة — قابلة للاختيار لكل مشروع على حدة.
-- ونوع تصنيف للعنصر نفسه (عادي/مقدمة/انترو/نوع مخصص) لعرضه ببطاقة مختلفة
-- ومنفصلة عن الشبكة الرئيسية. بلا قيود CHECK صارمة على القيم — بنفس نمط
-- عمود episodes.pipeline_stage الموجود مسبقاً (تحقّق من جهة العميل/TypeScript
-- فقط)، حتى لا تُعطَّل أي كتابة مستقبلية بقيمة جديدة قبل تحديث القيد يدوياً.
-- ══════════════════════════════════════════════════════════════════════════

alter table public.projects
  add column if not exists item_noun_key text not null default 'episodes',
  add column if not exists item_noun_custom_singular text,
  add column if not exists item_noun_custom_plural text;

alter table public.episodes
  add column if not exists kind text not null default 'regular',
  add column if not exists kind_label text;
