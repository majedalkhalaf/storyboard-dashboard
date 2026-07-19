-- إضافة عمود مرن لحقول القالب الخاصة بكل نوع مشروع (ريلز/هوية بصرية/إلخ)
-- بنفس نمط storyboard_scenes.camera_setup/director_notes الموجود مسبقاً —
-- بلا قيد CHECK، إضافي بالكامل، القيمة الافتراضية '{}' فلا يوجد أي تأثير
-- على الحلقات الحالية. انظر app/lib/project-templates/ لتعريف كل قالب.
alter table public.episodes
  add column if not exists meta jsonb not null default '{}'::jsonb;

comment on column public.episodes.meta is
  'حقول إضافية خاصة بقالب نوع المشروع (مثال: hook/hashtags/music لريلز، deliverable_type لهوية بصرية) — انظر app/lib/project-templates/';
