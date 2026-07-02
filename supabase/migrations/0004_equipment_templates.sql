-- جداول إضافية: المعدات وقوالب المشاريع (كل شركة تدير معداتها وقوالبها الخاصة)

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  category text not null default 'accessories',
  quantity integer not null default 1,
  status text not null default 'available' check (status in ('available', 'in_use', 'maintenance')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.equipment enable row level security;

create trigger touch_equipment_updated_at before update on public.equipment
  for each row execute function public.touch_updated_at();

create policy "أعضاء الشركة يديرون معداتهم" on public.equipment for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

create table if not exists public.project_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  project_type text,
  is_active boolean not null default true,
  stages jsonb not null default '[]'::jsonb,
  services jsonb not null default '[]'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_templates enable row level security;

create trigger touch_project_templates_updated_at before update on public.project_templates
  for each row execute function public.touch_updated_at();

create policy "أعضاء الشركة يديرون قوالبهم" on public.project_templates for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
