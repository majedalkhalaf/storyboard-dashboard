-- ══════════════════════════════════════════════════════════════════════════
-- نظام إدارة الإنتاج — Production Management System
-- المخطط الأساسي (multi-tenant) — Migration 0001
-- ══════════════════════════════════════════════════════════════════════════
-- يُنفَّذ مرة واحدة كاملاً على مشروع Supabase جديد ومنفصل.
-- البنية: كل شيء يدور حول company_id (شركة/حساب إنتاج) بدل owner_id فردي،
-- بحيث تدعم المنصة أكثر من شركة، كل شركة بمستخدميها وعملائها ومشاريعها
-- منفصلة تماماً عن غيرها (RLS على مستوى قاعدة البيانات وليس فقط الواجهة).
-- ══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

set check_function_bodies = off;

-- ──────────────────────────────────────────────────────────────
-- 0) دوال مساعدة (تُستخدم داخل سياسات RLS) — security definer لتفادي
--    التكرار اللانهائي عند قراءة profiles من داخل سياسة profiles نفسها
-- ──────────────────────────────────────────────────────────────
create or replace function public.auth_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_company_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.auth_role() in ('company_owner', 'admin', 'super_admin'), false);
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ──────────────────────────────────────────────────────────────
-- 1) الشركات (كل شركة = مساحة عمل مستقلة)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  primary_color text not null default '#7C3AED',
  secondary_color text not null default '#111827',
  accent_color text not null default '#D4AF37',
  font_ar text,
  font_en text,
  email text,
  phone text,
  website text,
  address text,
  commercial_register text,
  tax_number text,
  social_links jsonb not null default '{}'::jsonb,
  stamp_url text,
  signature_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;

create trigger touch_companies_updated_at before update on public.companies
  for each row execute function public.touch_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 2) الملف الشخصي لكل مستخدم (داخلي أو عميل)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  role text not null default 'client'
    check (role in ('super_admin', 'company_owner', 'admin', 'team_member', 'client')),
  full_name text,
  email text,
  phone text,
  avatar_url text,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create trigger touch_profiles_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

-- ──────────────────────────────────────────────────────────────
-- 3) إنشاء الشركة عند التسجيل (دالة آمنة تتجاوز RLS بدل سياسة insert مفتوحة)
-- ──────────────────────────────────────────────────────────────
create or replace function public.create_company_and_owner(
  p_company_name text,
  p_email text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_existing uuid;
begin
  select company_id into v_existing from public.profiles where id = auth.uid();
  if v_existing is not null then
    raise exception 'المستخدم مرتبط بشركة بالفعل';
  end if;

  insert into public.companies (name, email, phone)
  values (p_company_name, p_email, p_phone)
  returning id into v_company_id;

  update public.profiles
    set company_id = v_company_id, role = 'company_owner'
    where id = auth.uid();

  return v_company_id;
end;
$$;

-- ──────────────────────────────────────────────────────────────
-- 4) دعوات أعضاء الفريق الداخلي
-- ──────────────────────────────────────────────────────────────
create table if not exists public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'team_member')),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table public.company_invites enable row level security;

-- ──────────────────────────────────────────────────────────────
-- 5) سجل العملاء داخل كل شركة
-- ──────────────────────────────────────────────────────────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create trigger touch_clients_updated_at before update on public.clients
  for each row execute function public.touch_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 6) المشاريع
-- ──────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  created_by uuid references public.profiles(id),
  name text not null,
  type text,
  custom_type text,
  status text not null default 'planning'
    check (status in ('planning', 'in_progress', 'review', 'completed', 'delivered', 'archived', 'cancelled')),
  cover_image_url text,
  shooting_date date,
  delivery_date date,
  budget numeric,
  location text,
  storage_link text,
  notes text,
  progress numeric not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create trigger touch_projects_updated_at before update on public.projects
  for each row execute function public.touch_updated_at();

create index if not exists idx_projects_company on public.projects(company_id);
create index if not exists idx_projects_client on public.projects(client_id);

-- ──────────────────────────────────────────────────────────────
-- 7) خدمات المشروع
-- ──────────────────────────────────────────────────────────────
create table if not exists public.project_services (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  category text not null,
  service_key text not null,
  label text not null,
  is_custom boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.project_services enable row level security;
create index if not exists idx_project_services_project on public.project_services(project_id);

-- ──────────────────────────────────────────────────────────────
-- 8) الحلقات / العناصر
-- ──────────────────────────────────────────────────────────────
create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  number integer,
  title text not null,
  cover_image_url text,
  description text,
  type text,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'in_review', 'ready_for_approval', 'approved', 'delivered')),
  progress numeric not null default 0,
  script text,
  scenario text,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.episodes enable row level security;

create trigger touch_episodes_updated_at before update on public.episodes
  for each row execute function public.touch_updated_at();

create index if not exists idx_episodes_project on public.episodes(project_id);

-- ──────────────────────────────────────────────────────────────
-- 9) مراحل تنفيذ كل حلقة + حساب نسبة الإنجاز تلقائياً
-- ──────────────────────────────────────────────────────────────
create table if not exists public.episode_stages (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  key text not null,
  label text not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  progress numeric not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  updated_by uuid references public.profiles(id),
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.episode_stages enable row level security;

create trigger touch_episode_stages_updated_at before update on public.episode_stages
  for each row execute function public.touch_updated_at();

create index if not exists idx_episode_stages_episode on public.episode_stages(episode_id);

create or replace function public.recompute_episode_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_episode_id uuid;
  v_avg numeric;
begin
  v_episode_id := coalesce(new.episode_id, old.episode_id);
  select coalesce(avg(progress), 0) into v_avg from public.episode_stages where episode_id = v_episode_id;
  update public.episodes set progress = round(v_avg) where id = v_episode_id;
  return null;
end;
$$;

create trigger episode_stages_recompute_progress
  after insert or update or delete on public.episode_stages
  for each row execute function public.recompute_episode_progress();

-- ──────────────────────────────────────────────────────────────
-- 10) الملفات والمرفقات
-- ──────────────────────────────────────────────────────────────
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  uploaded_by uuid references public.profiles(id),
  name text not null,
  storage_path text,
  external_url text,
  file_type text,
  category text not null default 'other'
    check (category in ('image', 'video', 'document', 'audio', 'archive', 'link', 'other')),
  size_bytes bigint,
  client_visible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.files enable row level security;
create index if not exists idx_files_project on public.files(project_id);
create index if not exists idx_files_episode on public.files(episode_id);

-- ──────────────────────────────────────────────────────────────
-- 11) الملاحظات والتعليقات (polymorphic على المشروع/الحلقة/الفيديو...)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  target_type text not null default 'project'
    check (target_type in ('project', 'episode', 'video', 'image', 'file', 'script', 'scenario', 'storyboard')),
  target_id uuid,
  parent_note_id uuid references public.notes(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  author_role text,
  body text not null,
  status text not null default 'new'
    check (status in ('new', 'in_review', 'in_progress', 'done', 'closed', 'rejected')),
  mentions jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;

create trigger touch_notes_updated_at before update on public.notes
  for each row execute function public.touch_updated_at();

create index if not exists idx_notes_project on public.notes(project_id);
create index if not exists idx_notes_episode on public.notes(episode_id);

-- ──────────────────────────────────────────────────────────────
-- 12) اعتماد الحلقات من العميل
-- ──────────────────────────────────────────────────────────────
create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  client_id uuid references public.profiles(id),
  note text,
  device_info text,
  approved_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id)
);

alter table public.approvals enable row level security;
create index if not exists idx_approvals_episode on public.approvals(episode_id);

-- ──────────────────────────────────────────────────────────────
-- 13) الفواتير والدفعات
-- ──────────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  client_id uuid references public.clients(id),
  number text not null,
  issue_date date not null default current_date,
  due_date date,
  amount numeric not null,
  tax numeric not null default 0,
  status text not null default 'unpaid' check (status in ('draft', 'unpaid', 'paid', 'overdue', 'cancelled')),
  pdf_url text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invoices enable row level security;

create trigger touch_invoices_updated_at before update on public.invoices
  for each row execute function public.touch_updated_at();

create index if not exists idx_invoices_project on public.invoices(project_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  amount numeric not null,
  due_date date,
  paid_date date,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue', 'cancelled')),
  method text,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create trigger touch_payments_updated_at before update on public.payments
  for each row execute function public.touch_updated_at();

create index if not exists idx_payments_project on public.payments(project_id);

-- ──────────────────────────────────────────────────────────────
-- 14) العقود والعروض
-- ──────────────────────────────────────────────────────────────
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  client_id uuid references public.clients(id),
  title text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'pending_signature', 'signed', 'cancelled')),
  version integer not null default 1,
  pdf_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contracts enable row level security;

create trigger touch_contracts_updated_at before update on public.contracts
  for each row execute function public.touch_updated_at();

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  client_id uuid references public.clients(id),
  type text not null default 'general'
    check (type in ('technical', 'financial', 'final', 'pricing', 'investor', 'general')),
  title text not null,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  pdf_url text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.proposals enable row level security;

create trigger touch_proposals_updated_at before update on public.proposals
  for each row execute function public.touch_updated_at();

-- ──────────────────────────────────────────────────────────────
-- 15) المصروفات (داخلي فقط — للربح والخسارة)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  amount numeric not null,
  category text,
  expense_date date not null default current_date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

-- ──────────────────────────────────────────────────────────────
-- 16) الإشعارات
-- ──────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  type text not null,
  title text,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create index if not exists idx_notifications_user on public.notifications(user_id, is_read);

create or replace function public.notify_user(
  p_user_id uuid,
  p_company_id uuid,
  p_project_id uuid,
  p_episode_id uuid,
  p_type text,
  p_title text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, company_id, project_id, episode_id, type, title, message)
  values (p_user_id, p_company_id, p_project_id, p_episode_id, p_type, p_title, p_message)
  returning id into v_id;
  return v_id;
end;
$$;

-- ──────────────────────────────────────────────────────────────
-- 17) سجل النشاط (Audit Log) — إدراج فقط، لا تعديل ولا حذف
-- ──────────────────────────────────────────────────────────────
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  episode_id uuid references public.episodes(id) on delete set null,
  actor_id uuid references public.profiles(id),
  actor_role text,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.activity_logs enable row level security;
create index if not exists idx_activity_logs_company on public.activity_logs(company_id, created_at desc);
create index if not exists idx_activity_logs_project on public.activity_logs(project_id, created_at desc);

create or replace function public.log_activity(
  p_company_id uuid,
  p_project_id uuid,
  p_episode_id uuid,
  p_action text,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_role text;
begin
  select role into v_role from public.profiles where id = auth.uid();
  insert into public.activity_logs (company_id, project_id, episode_id, actor_id, actor_role, action, details)
  values (p_company_id, p_project_id, p_episode_id, auth.uid(), v_role, p_action, p_details)
  returning id into v_id;
  return v_id;
end;
$$;

-- ──────────────────────────────────────────────────────────────
-- 18) صلاحيات العميل على كل مشروع (الجدول الأهم لبوابة العميل)
-- ──────────────────────────────────────────────────────────────
create table if not exists public.project_clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_user_id uuid references public.profiles(id) on delete cascade,
  invited_email text not null,
  invite_token text unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled', 'revoked')),
  permissions jsonb not null default '{
    "view_project": true, "episodes": true, "files": true, "download_files": true,
    "download_project": false, "add_notes": true, "reply_notes": true, "approve_episodes": true,
    "finance": false, "payments": false, "invoices": true, "contracts": false, "proposals": false,
    "request_service": false, "request_meeting": false, "upload_attachments": true,
    "execution_phases": true, "script": false, "scenario": false, "storyboard": false
  }'::jsonb,
  invited_by uuid references public.profiles(id),
  invited_at timestamptz not null default now(),
  activated_at timestamptz
);

alter table public.project_clients enable row level security;
create index if not exists idx_project_clients_project on public.project_clients(project_id);
create index if not exists idx_project_clients_user on public.project_clients(client_user_id);

-- ──────────────────────────────────────────────────────────────
-- 19) تفضيلات المستخدم
-- ──────────────────────────────────────────────────────────────
create table if not exists public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  language text not null default 'ar' check (language in ('ar', 'en')),
  notifications_enabled boolean not null default true,
  extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create trigger touch_user_settings_updated_at before update on public.user_settings
  for each row execute function public.touch_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ══════════════════════════════════════════════════════════════════════════
-- سياسات RLS
-- ══════════════════════════════════════════════════════════════════════════

-- companies ------------------------------------------------------------
create policy "أعضاء الشركة يرون شركتهم" on public.companies for select
  using (id = public.auth_company_id());
create policy "مدير الشركة يعدّل بيانات شركته" on public.companies for update
  using (id = public.auth_company_id() and public.is_company_admin())
  with check (id = public.auth_company_id() and public.is_company_admin());

-- profiles ---------------------------------------------------------------
create policy "المستخدم يقرأ ملفه الشخصي" on public.profiles for select
  using (id = auth.uid());
create policy "زملاء الشركة يرون بعضهم" on public.profiles for select
  using (company_id is not null and company_id = public.auth_company_id());
create policy "المستخدم يعدّل ملفه الشخصي فقط" on public.profiles for update
  using (id = auth.uid());

-- company_invites ---------------------------------------------------------
create policy "مدير الشركة يدير دعوات فريقه" on public.company_invites for all
  using (company_id = public.auth_company_id() and public.is_company_admin())
  with check (company_id = public.auth_company_id() and public.is_company_admin());

-- clients -------------------------------------------------------------------
create policy "أعضاء الشركة يديرون سجل عملائهم" on public.clients for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

-- projects ------------------------------------------------------------------
create policy "أعضاء الشركة يديرون مشاريعهم" on public.projects for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
create policy "العميل يرى فقط المشاريع المصرَّح له بها" on public.projects for select
  using (exists (
    select 1 from public.project_clients pc
    where pc.project_id = projects.id and pc.client_user_id = auth.uid() and pc.status = 'active'
  ));

-- project_services ------------------------------------------------------------
create policy "أعضاء الشركة يديرون خدمات مشاريعهم" on public.project_services for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
create policy "العميل يرى خدمات مشروعه" on public.project_services for select
  using (exists (
    select 1 from public.project_clients pc
    where pc.project_id = project_services.project_id and pc.client_user_id = auth.uid() and pc.status = 'active'
  ));

-- episodes --------------------------------------------------------------------
create policy "أعضاء الشركة يديرون حلقات مشاريعهم" on public.episodes for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
create policy "العميل يرى حلقات مشروعه إن سُمح له" on public.episodes for select
  using (exists (
    select 1 from public.project_clients pc
    where pc.project_id = episodes.project_id and pc.client_user_id = auth.uid()
      and pc.status = 'active' and coalesce((pc.permissions->>'episodes')::boolean, false)
  ));

-- episode_stages ----------------------------------------------------------------
create policy "أعضاء الشركة يديرون مراحل حلقاتهم" on public.episode_stages for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
create policy "العميل يرى مراحل الحلقة إن سُمح له" on public.episode_stages for select
  using (exists (
    select 1 from public.episodes e
    join public.project_clients pc on pc.project_id = e.project_id
    where e.id = episode_stages.episode_id and pc.client_user_id = auth.uid()
      and pc.status = 'active' and coalesce((pc.permissions->>'execution_phases')::boolean, false)
  ));

-- files ---------------------------------------------------------------------------
create policy "أعضاء الشركة يديرون ملفات مشاريعهم" on public.files for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
create policy "العميل يرى الملفات المتاحة له فقط" on public.files for select
  using (client_visible = true and exists (
    select 1 from public.project_clients pc
    where pc.project_id = files.project_id and pc.client_user_id = auth.uid()
      and pc.status = 'active' and coalesce((pc.permissions->>'files')::boolean, false)
  ));
create policy "العميل يرفع مرفقات إن سُمح له" on public.files for insert
  with check (exists (
    select 1 from public.project_clients pc
    where pc.project_id = files.project_id and pc.client_user_id = auth.uid()
      and pc.status = 'active' and coalesce((pc.permissions->>'upload_attachments')::boolean, false)
  ) and uploaded_by = auth.uid());

-- notes -----------------------------------------------------------------------------
create policy "أعضاء الشركة يديرون كل ملاحظات مشاريعهم" on public.notes for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
create policy "العميل يرى ملاحظات مشروعه" on public.notes for select
  using (exists (
    select 1 from public.project_clients pc
    where pc.project_id = notes.project_id and pc.client_user_id = auth.uid() and pc.status = 'active'
  ));
create policy "العميل يضيف ملاحظة إن سُمح له" on public.notes for insert
  with check (
    author_id = auth.uid() and exists (
      select 1 from public.project_clients pc
      where pc.project_id = notes.project_id and pc.client_user_id = auth.uid()
        and pc.status = 'active'
        and coalesce((pc.permissions->>(case when notes.parent_note_id is null then 'add_notes' else 'reply_notes' end))::boolean, false)
    )
  );

-- approvals ---------------------------------------------------------------------------
create policy "أعضاء الشركة يديرون اعتمادات مشاريعهم" on public.approvals for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
create policy "العميل يرى اعتماداته" on public.approvals for select
  using (exists (
    select 1 from public.project_clients pc
    where pc.project_id = approvals.project_id and pc.client_user_id = auth.uid() and pc.status = 'active'
  ));
create policy "العميل يعتمد حلقة مشروعه إن سُمح له" on public.approvals for insert
  with check (
    client_id = auth.uid() and exists (
      select 1 from public.project_clients pc
      where pc.project_id = approvals.project_id and pc.client_user_id = auth.uid()
        and pc.status = 'active' and coalesce((pc.permissions->>'approve_episodes')::boolean, false)
    )
  );

-- invoices / payments -------------------------------------------------------------------
create policy "مدير الشركة يدير فواتير مشاريعه" on public.invoices for all
  using (company_id = public.auth_company_id() and public.is_company_admin())
  with check (company_id = public.auth_company_id() and public.is_company_admin());
create policy "أعضاء الشركة يرون فواتير مشاريعهم" on public.invoices for select
  using (company_id = public.auth_company_id());
create policy "العميل يرى فواتير مشروعه إن سُمح له" on public.invoices for select
  using (exists (
    select 1 from public.project_clients pc
    where pc.project_id = invoices.project_id and pc.client_user_id = auth.uid()
      and pc.status = 'active' and coalesce((pc.permissions->>'invoices')::boolean, false)
  ));

create policy "مدير الشركة يدير دفعات مشاريعه" on public.payments for all
  using (company_id = public.auth_company_id() and public.is_company_admin())
  with check (company_id = public.auth_company_id() and public.is_company_admin());
create policy "أعضاء الشركة يرون دفعات مشاريعهم" on public.payments for select
  using (company_id = public.auth_company_id());
create policy "العميل يرى دفعات مشروعه إن سُمح له" on public.payments for select
  using (exists (
    select 1 from public.project_clients pc
    where pc.project_id = payments.project_id and pc.client_user_id = auth.uid()
      and pc.status = 'active' and coalesce((pc.permissions->>'payments')::boolean, false)
  ));

-- contracts / proposals -------------------------------------------------------------------
create policy "مدير الشركة يدير عقود مشاريعه" on public.contracts for all
  using (company_id = public.auth_company_id() and public.is_company_admin())
  with check (company_id = public.auth_company_id() and public.is_company_admin());
create policy "أعضاء الشركة يرون عقود مشاريعهم" on public.contracts for select
  using (company_id = public.auth_company_id());
create policy "العميل يرى عقود مشروعه إن سُمح له" on public.contracts for select
  using (exists (
    select 1 from public.project_clients pc
    where pc.project_id = contracts.project_id and pc.client_user_id = auth.uid()
      and pc.status = 'active' and coalesce((pc.permissions->>'contracts')::boolean, false)
  ));

create policy "مدير الشركة يدير عروض مشاريعه" on public.proposals for all
  using (company_id = public.auth_company_id() and public.is_company_admin())
  with check (company_id = public.auth_company_id() and public.is_company_admin());
create policy "أعضاء الشركة يرون عروض مشاريعهم" on public.proposals for select
  using (company_id = public.auth_company_id());
create policy "العميل يرى عروض مشروعه إن سُمح له" on public.proposals for select
  using (project_id is not null and exists (
    select 1 from public.project_clients pc
    where pc.project_id = proposals.project_id and pc.client_user_id = auth.uid()
      and pc.status = 'active' and coalesce((pc.permissions->>'proposals')::boolean, false)
  ));

-- expenses -----------------------------------------------------------------------------------
create policy "مدير الشركة يدير مصروفات مشاريعه" on public.expenses for all
  using (company_id = public.auth_company_id() and public.is_company_admin())
  with check (company_id = public.auth_company_id() and public.is_company_admin());

-- notifications ---------------------------------------------------------------------------------
create policy "كل مستخدم يدير إشعاراته فقط" on public.notifications for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- activity_logs (إدراج فقط عبر log_activity، بدون سياسة insert مباشرة) ---------------------------
create policy "أعضاء الشركة يرون سجل نشاط شركتهم" on public.activity_logs for select
  using (company_id = public.auth_company_id());

-- project_clients -----------------------------------------------------------------------------------
create policy "مدير الشركة يدير صلاحيات عملاء مشاريعه" on public.project_clients for all
  using (company_id = public.auth_company_id() and public.is_company_admin())
  with check (company_id = public.auth_company_id() and public.is_company_admin());
create policy "أعضاء الشركة يرون صلاحيات عملاء مشاريعهم" on public.project_clients for select
  using (company_id = public.auth_company_id());
create policy "العميل يرى صف صلاحياته الخاص فقط" on public.project_clients for select
  using (client_user_id = auth.uid());

-- user_settings ------------------------------------------------------------------------------------
create policy "كل مستخدم يدير تفضيلاته فقط" on public.user_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════════════════════
-- Storage: مساحتان — public-assets (شعارات/صور غلاف، قراءة عامة) و
-- project-files (مرفقات، خاصة تماماً، تُقرأ فقط عبر signed URL من السيرفر)
-- ══════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

create policy "قراءة عامة لـ public-assets" on storage.objects for select
  using (bucket_id = 'public-assets');

create policy "أعضاء الشركة يرفعون ضمن مجلد شركتهم في public-assets" on storage.objects
  for insert with check (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[1] = public.auth_company_id()::text
  );

create policy "أعضاء الشركة يديرون ملفات مجلد شركتهم في public-assets" on storage.objects
  for update using (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[1] = public.auth_company_id()::text
  );

create policy "أعضاء الشركة يحذفون ملفات مجلد شركتهم في public-assets" on storage.objects
  for delete using (
    bucket_id = 'public-assets'
    and (storage.foldername(name))[1] = public.auth_company_id()::text
  );

create policy "أعضاء الشركة يديرون مجلد شركتهم في project-files" on storage.objects
  for all using (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] = public.auth_company_id()::text
  )
  with check (
    bucket_id = 'project-files'
    and (storage.foldername(name))[1] = public.auth_company_id()::text
  );

-- ──────────────────────────────────────────────────────────────
-- نهاية المخطط — تحقق سريع بعد التنفيذ:
--   select * from public.companies;
--   select * from public.profiles;
-- ──────────────────────────────────────────────────────────────
