-- كتيّب المشروع النهائي: نفس بنية project_presentations تماماً (سجل واحد لكل مشروع،
-- أقسام مفعّلة/مرتّبة + قالب + نصوص قابلة للتعديل) لكنه سجل مستقل تماماً — الكتيّب
-- ميزة منفصلة عن العرض الفني (يُفتح من زر مستقل في صفحة المشروع)، يُستخدم عادة بعد
-- انتهاء المشروع لتسليم ملخص شامل للعميل، بعكس العرض الفني الذي يُستخدم قبل البدء.
create table if not exists public.project_booklets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  project_id uuid not null unique references public.projects(id) on delete cascade,
  template text not null default 'brand'
    check (template in ('brand','minimal','luxury','dark','corporate','creative','podcast','real_estate','agency','cinema','startup')),
  sections jsonb not null default '[]'::jsonb,
  texts jsonb not null default '{}'::jsonb,
  share_token text unique,
  share_enabled boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_booklets enable row level security;

create trigger touch_project_booklets_updated_at before update on public.project_booklets
  for each row execute function public.touch_updated_at();

create index if not exists idx_project_booklets_share_token on public.project_booklets(share_token) where share_token is not null;

-- لا توجد سياسة قراءة عامة عمداً (نفس منطق project_presentations) — صفحة المشاركة
-- العامة (/booklet/[token]) تُقرأ عبر عميل service_role على السيرفر فقط بعد مطابقة
-- share_token صراحةً في الكود.
create policy "أعضاء الشركة يديرون كتيّبات مشاريعهم" on public.project_booklets for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
