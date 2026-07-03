-- ══════════════════════════════════════════════════════════════════════════
-- توسعة قسم المالية إلى نظام محاسبي شبيه بـERP: كود مالي فريد لكل مشروع،
-- تصنيفات مالية، موردون، حسابات بنكية وحركاتها، وربطها بالمصروفات/الدفعات.
-- كل الجداول الجديدة داخلية بحتة (لا تظهر للعميل إطلاقاً) فلا تحتاج سياسات عميل.
-- ══════════════════════════════════════════════════════════════════════════

-- 1) كود مالي فريد لكل مشروع بصيغة PRJ-YYYY-NNN (تسلسل سنوي لكل شركة) ------------------
alter table public.projects add column if not exists code text;

create or replace function public.generate_project_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year text := to_char(coalesce(new.created_at, now()), 'YYYY');
  v_seq int;
begin
  if new.code is not null then
    return new;
  end if;
  select count(*) + 1 into v_seq
  from public.projects
  where company_id = new.company_id and code like ('PRJ-' || v_year || '-%');
  new.code := 'PRJ-' || v_year || '-' || lpad(v_seq::text, 3, '0');
  return new;
end;
$$;

drop trigger if exists projects_generate_code on public.projects;
create trigger projects_generate_code before insert on public.projects
  for each row execute function public.generate_project_code();

-- تعبئة الكود للمشاريع الموجودة مسبقاً (بترتيب الإنشاء داخل كل شركة/سنة)
with numbered as (
  select id, company_id,
    'PRJ-' || to_char(created_at, 'YYYY') || '-' ||
      lpad(row_number() over (partition by company_id, to_char(created_at, 'YYYY') order by created_at)::text, 3, '0') as new_code
  from public.projects
  where code is null
)
update public.projects p set code = n.new_code from numbered n where p.id = n.id;

create unique index if not exists idx_projects_company_code on public.projects(company_id, code);

-- 2) التصنيفات المالية (لتصنيف المصروفات والإيرادات) ---------------------------------------
create table if not exists public.financial_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  type text not null default 'expense' check (type in ('income', 'expense')),
  color text not null default '#6B7280',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.financial_categories enable row level security;

create policy "مدير الشركة يدير التصنيفات المالية" on public.financial_categories for all
  using (company_id = public.auth_company_id() and public.is_company_admin())
  with check (company_id = public.auth_company_id() and public.is_company_admin());
create policy "أعضاء الشركة يرون التصنيفات المالية" on public.financial_categories for select
  using (company_id = public.auth_company_id());

insert into public.financial_categories (company_id, name, type, color, sort_order)
select c.id, s.name, 'expense', s.color, s.sort_order
from public.companies c
cross join (values
  ('مواد بناء', '#3987e5', 0),
  ('معدات', '#199e70', 1),
  ('عمالة', '#b8801f', 2),
  ('مقاولين', '#3987e5', 3),
  ('مصاريف إدارية', '#199e70', 4),
  ('أخرى', '#6B7280', 5)
) as s(name, color, sort_order)
where not exists (select 1 from public.financial_categories fc where fc.company_id = c.id);

-- 3) الموردون -----------------------------------------------------------------------------
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  category text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vendors enable row level security;

create trigger touch_vendors_updated_at before update on public.vendors
  for each row execute function public.touch_updated_at();

create policy "مدير الشركة يدير الموردين" on public.vendors for all
  using (company_id = public.auth_company_id() and public.is_company_admin())
  with check (company_id = public.auth_company_id() and public.is_company_admin());
create policy "أعضاء الشركة يرون الموردين" on public.vendors for select
  using (company_id = public.auth_company_id());

-- 4) الحسابات البنكية وحركاتها --------------------------------------------------------------
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  bank_name text,
  account_number text,
  iban text,
  currency text not null default 'SAR',
  opening_balance numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bank_accounts enable row level security;

create trigger touch_bank_accounts_updated_at before update on public.bank_accounts
  for each row execute function public.touch_updated_at();

create policy "مدير الشركة يدير الحسابات البنكية" on public.bank_accounts for all
  using (company_id = public.auth_company_id() and public.is_company_admin())
  with check (company_id = public.auth_company_id() and public.is_company_admin());
create policy "أعضاء الشركة يرون الحسابات البنكية" on public.bank_accounts for select
  using (company_id = public.auth_company_id());

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdrawal', 'transfer_in', 'transfer_out')),
  amount numeric not null,
  transaction_date date not null default current_date,
  reference text,
  description text,
  related_payment_id uuid references public.payments(id) on delete set null,
  related_expense_id uuid references public.expenses(id) on delete set null,
  reconciled boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.bank_transactions enable row level security;

create policy "مدير الشركة يدير حركات الحسابات البنكية" on public.bank_transactions for all
  using (company_id = public.auth_company_id() and public.is_company_admin())
  with check (company_id = public.auth_company_id() and public.is_company_admin());
create policy "أعضاء الشركة يرون حركات الحسابات البنكية" on public.bank_transactions for select
  using (company_id = public.auth_company_id());

create index if not exists idx_bank_transactions_account on public.bank_transactions(bank_account_id);

-- 5) ربط المصروفات بالموردين/التصنيفات المالية، والدفعات بالحساب البنكي ------------------------
alter table public.expenses add column if not exists vendor_id uuid references public.vendors(id) on delete set null;
alter table public.expenses add column if not exists category_id uuid references public.financial_categories(id) on delete set null;
alter table public.payments add column if not exists bank_account_id uuid references public.bank_accounts(id) on delete set null;

-- 6) بذر التصنيفات المالية الافتراضية للشركات المستقبلية عبر create_company_and_owner -------
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

  insert into public.company_pipeline_stages (company_id, key, label, color, notify_client, sort_order)
  values
    (v_company_id, 'planning', 'تخطيط', '#6B7280', false, 0),
    (v_company_id, 'script', 'كتابة سكربت', '#F59E0B', false, 1),
    (v_company_id, 'storyboard', 'Storyboard', '#F59E0B', false, 2),
    (v_company_id, 'ready_to_shoot', 'جاهز للتصوير', '#3B82F6', false, 3),
    (v_company_id, 'shooting', 'تصوير', '#3B82F6', false, 4),
    (v_company_id, 'file_transfer', 'نقل الملفات', '#3B82F6', false, 5),
    (v_company_id, 'editing', 'مونتاج', '#F59E0B', false, 6),
    (v_company_id, 'internal_review', 'مراجعة داخلية', '#06B6D4', false, 7),
    (v_company_id, 'awaiting_client', 'بانتظار العميل', '#06B6D4', true, 8),
    (v_company_id, 'revisions', 'تعديلات', '#F59E0B', true, 9),
    (v_company_id, 'approved', 'معتمد', '#1DB954', true, 10),
    (v_company_id, 'delivered', 'مسلم', '#10B981', true, 11),
    (v_company_id, 'archived', 'مؤرشف', '#6B7280', false, 12);

  insert into public.financial_categories (company_id, name, type, color, sort_order)
  values
    (v_company_id, 'مواد بناء', 'expense', '#3987e5', 0),
    (v_company_id, 'معدات', 'expense', '#199e70', 1),
    (v_company_id, 'عمالة', 'expense', '#b8801f', 2),
    (v_company_id, 'مقاولين', 'expense', '#3987e5', 3),
    (v_company_id, 'مصاريف إدارية', 'expense', '#199e70', 4),
    (v_company_id, 'أخرى', 'expense', '#6B7280', 5);

  return v_company_id;
end;
$$;
