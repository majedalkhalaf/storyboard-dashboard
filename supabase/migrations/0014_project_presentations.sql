-- Presentation Builder: إعدادات عرض تقديمي واحد نشط لكل مشروع (أقسام مفعّلة/مرتّبة + قالب + نصوص قابلة للتعديل)
create table if not exists public.project_presentations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null unique references public.projects(id) on delete cascade,
  template text not null default 'minimal'
    check (template in ('minimal','luxury','dark','corporate','creative','podcast','real_estate','agency','cinema','startup')),
  sections jsonb not null default '[]'::jsonb,
  texts jsonb not null default '{}'::jsonb,
  share_token text unique,
  share_enabled boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_presentations enable row level security;

create trigger touch_project_presentations_updated_at before update on public.project_presentations
  for each row execute function public.touch_updated_at();

create index if not exists idx_project_presentations_share_token on public.project_presentations(share_token) where share_token is not null;

-- لا توجد سياسة قراءة عامة عمداً: صفحة المشاركة العامة (/present/[token]) تُقرأ عبر عميل
-- service_role على السيرفر فقط (createAdminClient) بعد مطابقة share_token صراحةً في الكود،
-- لتفادي أي تسريب بين الشركات لو استُخدم مفتاح anon مباشرة على هذا الجدول.
create policy "أعضاء الشركة يديرون عروض مشاريعهم" on public.project_presentations for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

-- نصوص افتراضية على مستوى الشركة (ترحيب/شكر/نبذة/قيم/رؤية...) تُستخدم كقيمة مبدئية لأي
-- عرض جديد بدل إعادة كتابتها في كل مشروع.
alter table public.companies add column if not exists presentation_defaults jsonb not null default '{}'::jsonb;
