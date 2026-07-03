-- ══════════════════════════════════════════════════════════════════════════
-- توسعة نظام دعوة العميل: مدة صلاحية الدعوة، نوع الوصول، معلومات تعريفية
-- إضافية للعميل (المسمى الوظيفي/اسم الشركة)، ومسودات الدعوات غير المُرسلة بعد.
-- ══════════════════════════════════════════════════════════════════════════

alter table public.clients add column if not exists job_title text;
alter table public.clients add column if not exists client_company_name text;

alter table public.project_clients add column if not exists expires_at timestamptz;
alter table public.project_clients add column if not exists access_type text not null default 'unlimited'
  check (access_type in ('unlimited', 'single_use', 'until_project_end', 'until_date'));

create table if not exists public.client_invite_drafts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_by uuid references public.profiles(id),
  client_name text not null,
  email text not null,
  -- بقية حقول المعالج (الهاتف، المسمى الوظيفي، اسم الشركة، نوع الدعوة، الصلاحيات
  -- المختارة، المدة، نوع الوصول، طريقة الإرسال) كـjsonb حر — لا تحتاج أعمدة مستقلة
  -- لأنها لا تُستعلم عنها مباشرة، فقط تُعرض وتُستكمل عند "متابعة" المسودة.
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_invite_drafts enable row level security;

create trigger touch_client_invite_drafts_updated_at before update on public.client_invite_drafts
  for each row execute function public.touch_updated_at();

create policy "أعضاء الشركة يديرون مسودات دعوات مشاريعهم" on public.client_invite_drafts for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

create index if not exists idx_client_invite_drafts_project on public.client_invite_drafts(project_id);
