-- حقل "وصف مختصر للمشروع" منفصل عن "ملاحظات عامة" (notes) — الويزارد الجديد
-- لإنشاء المشروع يعرضهما كحقلين مستقلين.
alter table public.projects add column if not exists description text;
