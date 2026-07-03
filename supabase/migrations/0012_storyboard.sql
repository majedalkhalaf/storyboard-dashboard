-- Storyboard: كل حلقة لها Storyboard مستقل بالكامل (لا يرتبط بحلقات أخرى)،
-- يتكوّن من مشاهد (Shots) بترتيب متسلسل، كل مشهد يحمل تفاصيله الإخراجية والتقنية الخاصة.

create table if not exists public.storyboard_scenes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  number integer,
  title text not null,
  description text,
  shot_goal text,
  cover_image_url text,
  duration_seconds integer,
  shot_type text,
  location text,
  shooting_date date,
  shooting_time time,
  status text not null default 'planning'
    check (status in ('planning', 'ready_to_shoot', 'shot', 'editing', 'client_review', 'approved')),
  progress numeric not null default 0,
  sort_order integer not null default 0,
  -- حزمتان مرنتان (نفس نمط content/social_links jsonb المستخدم في جداول أخرى بالمشروع) بدل عشرات
  -- الأعمدة الثابتة لكل حقل كاميرا/إخراج — المفاتيح المتوقعة موثّقة في app/lib/storyboard-constants.ts
  camera_setup jsonb not null default '{}'::jsonb,
  director_notes jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.storyboard_scenes enable row level security;

create index if not exists idx_storyboard_scenes_episode on public.storyboard_scenes(episode_id, sort_order);

create trigger touch_storyboard_scenes_updated_at before update on public.storyboard_scenes
  for each row execute function public.touch_updated_at();

create policy "أعضاء الشركة يديرون مشاهد ستوري بورد حلقاتهم" on public.storyboard_scenes for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

-- الممثلون/الشخصيات/العميل/المقدم/الضيوف لكل مشهد
create table if not exists public.storyboard_scene_cast (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  scene_id uuid not null references public.storyboard_scenes(id) on delete cascade,
  role_type text not null check (role_type in ('character', 'model', 'client', 'host', 'guest')),
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.storyboard_scene_cast enable row level security;

create index if not exists idx_storyboard_scene_cast_scene on public.storyboard_scene_cast(scene_id);

create policy "أعضاء الشركة يديرون طاقم مشاهد ستوري بورد" on public.storyboard_scene_cast for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

-- ربط المعدات الموجودة أصلاً (جدول equipment) بكل مشهد — علاقة متعددة لمتعددة
create table if not exists public.storyboard_scene_equipment (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  scene_id uuid not null references public.storyboard_scenes(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (scene_id, equipment_id)
);

alter table public.storyboard_scene_equipment enable row level security;

create index if not exists idx_storyboard_scene_equipment_scene on public.storyboard_scene_equipment(scene_id);

create policy "أعضاء الشركة يديرون معدات مشاهد ستوري بورد" on public.storyboard_scene_equipment for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

-- إعادة استخدام جدولي files وnotes الموجودين لمرفقات وملاحظات كل مشهد (بدل جداول مكرّرة) —
-- عمود scene_id اختياري، يبقى null لأي ملف/ملاحظة على مستوى المشروع أو الحلقة كما هو الحال اليوم.
alter table public.files add column if not exists scene_id uuid references public.storyboard_scenes(id) on delete cascade;
alter table public.notes add column if not exists scene_id uuid references public.storyboard_scenes(id) on delete cascade;

create index if not exists idx_files_scene on public.files(scene_id) where scene_id is not null;
create index if not exists idx_notes_scene on public.notes(scene_id) where scene_id is not null;
