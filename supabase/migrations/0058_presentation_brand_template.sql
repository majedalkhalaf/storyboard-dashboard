-- يضيف قيمة 'brand' لقالب العرض الفني — قالب ألوان محسوب مباشرة من هوية الشركة
-- الفعلية (primary_color/secondary_color/accent_color) بدل قوالب الألوان الثابتة
-- العشرة الحالية، ويصبح القيمة الافتراضية للعروض الجديدة كي تطابق الهوية البصرية
-- تلقائياً من أول لحظة.
alter table public.project_presentations drop constraint if exists project_presentations_template_check;
alter table public.project_presentations
  add constraint project_presentations_template_check
  check (template in ('brand','minimal','luxury','dark','corporate','creative','podcast','real_estate','agency','cinema','startup'));

alter table public.project_presentations alter column template set default 'brand';
