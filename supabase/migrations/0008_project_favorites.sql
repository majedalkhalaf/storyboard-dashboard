-- مشاريع مميّزة (Starred) لكل مستخدم داخلي على حدة — يدعم قسم "المشاريع المميزة"
-- في مساحة عمل المشاريع بدل بيانات وهمية.
create table if not exists public.project_favorites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

alter table public.project_favorites enable row level security;

create index if not exists idx_project_favorites_user on public.project_favorites(user_id);
create index if not exists idx_project_favorites_project on public.project_favorites(project_id);

create policy "المستخدم يدير مفضّلاته فقط" on public.project_favorites for all
  using (user_id = auth.uid() and company_id = public.auth_company_id())
  with check (user_id = auth.uid() and company_id = public.auth_company_id());
