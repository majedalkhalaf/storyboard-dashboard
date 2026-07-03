-- ══════════════════════════════════════════════════════════════════════════
-- هوية إرسال دعوات العملاء: بريد إلكتروني مخصص عبر SMTP (بدل بريد Supabase
-- الافتراضي)، ورقم/رقم واتساب مرجعي (بيانات وصفية فقط لعرضها عند نسخ رابط
-- الدعوة يدوياً — لا يوجد تكامل حقيقي لإرسال SMS/واتساب تلقائياً في هذا النظام).
--
-- company_email_senders لا تُمنح أي سياسة RLS مباشرة عمداً (RLS مفعّلة بلا
-- policies = لا وصول مباشر إطلاقاً من عميل Supabase العادي) لأن العمود
-- smtp_password حساس — كل قراءة/كتابة تمر حصراً عبر Route Handlers بصلاحية
-- service_role (تتجاوز RLS بالتصميم). صفحة الإعدادات تتعامل معها عبر API فقط.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.company_email_senders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null,
  from_name text not null,
  from_email text not null,
  smtp_host text not null,
  smtp_port int not null default 587,
  smtp_secure boolean not null default false,
  smtp_username text not null,
  smtp_password text not null,
  is_default boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_email_senders enable row level security;

create trigger touch_company_email_senders_updated_at before update on public.company_email_senders
  for each row execute function public.touch_updated_at();

-- أرقام مرجعية (بيانات وصفية فقط) لإرسال/واتساب يدوي — RLS عادية لأنها لا تحوي أسراراً
create table if not exists public.company_sender_numbers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  label text not null,
  phone_number text not null,
  is_default boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.company_sender_numbers enable row level security;

create policy "مدير الشركة يدير الأرقام المرجعية" on public.company_sender_numbers for all
  using (company_id = public.auth_company_id() and public.is_company_admin())
  with check (company_id = public.auth_company_id() and public.is_company_admin());
create policy "أعضاء الشركة يرون الأرقام المرجعية" on public.company_sender_numbers for select
  using (company_id = public.auth_company_id());

create unique index if not exists idx_one_default_email_sender_per_company
  on public.company_email_senders(company_id) where is_default;
create unique index if not exists idx_one_default_sender_number_per_company
  on public.company_sender_numbers(company_id) where is_default;
