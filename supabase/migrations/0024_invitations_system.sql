-- ══════════════════════════════════════════════════════════════════════════
-- إعادة بناء نظام دعوات العملاء حول سجل تدقيق حقيقي واحد (invitations) بدل
-- الاعتماد فقط على project_clients (التي تبقى مصدر الصلاحيات الحيّة). كل دعوة
-- تُنشئ صفاً هنا يتتبّع حالتها الفعلية (أُرسلت/فُتحت/قُبلت/انتهت/فشلت) عبر رابط
-- تتبّع خاص بنا (/api/invitations/track/[token]) بدل كشف رابط Supabase السحري
-- مباشرة في الرسالة، ما يتيح تسجيل وقت الفتح وIP والمتصفح فعلياً (وليس تقديراً).
--
-- company_whatsapp_config لا تُمنح أي سياسة RLS عمداً (نفس نمط
-- company_email_senders) لأن access_token سرّ حقيقي — الوصول حصراً عبر
-- Route Handlers بصلاحية service_role.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  phone text,
  delivery_method text not null check (delivery_method in ('email', 'link', 'whatsapp', 'sms')),
  token text not null unique,
  destination_url text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'opened', 'accepted', 'expired', 'cancelled')),
  error_message text,
  retry_count int not null default 0,
  invited_by uuid references public.profiles(id),
  sent_at timestamptz,
  opened_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  ip_address text,
  user_agent text,
  device text,
  browser text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invitations enable row level security;

create index if not exists idx_invitations_company on public.invitations(company_id, created_at desc);
create index if not exists idx_invitations_project on public.invitations(project_id, created_at desc);
create index if not exists idx_invitations_client_user on public.invitations(client_user_id);
create index if not exists idx_invitations_token on public.invitations(token);

create trigger touch_invitations_updated_at before update on public.invitations
  for each row execute function public.touch_updated_at();

-- القراءة/الإدارة اليدوية (سجل الدعوات في الإعدادات) لمديري الشركة فقط — الإنشاء
-- والتحديث الفعليان يتمّان عبر service_role من Route Handlers (تتجاوز RLS)،
-- هذه السياسة فقط لعرض السجل داخل صفحة الإعدادات عبر عميل المتصفح العادي.
create policy "مدير الشركة يرى سجل الدعوات" on public.invitations for select
  using (company_id = public.auth_company_id() and public.is_company_admin());

create table if not exists public.company_whatsapp_config (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null,
  phone_number_id text not null,
  business_phone_display text,
  access_token text not null,
  is_active boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_whatsapp_config enable row level security;

create trigger touch_company_whatsapp_config_updated_at before update on public.company_whatsapp_config
  for each row execute function public.touch_updated_at();

create unique index if not exists idx_one_active_whatsapp_config_per_company
  on public.company_whatsapp_config(company_id) where is_active;
