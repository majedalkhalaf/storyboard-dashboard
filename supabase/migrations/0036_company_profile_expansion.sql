-- توسيع "إعدادات الشركة والهوية البصرية" لتصبح ملفاً تعريفياً كاملاً للشركة
-- (Company Profile) بدل شعار وألوان فقط: هوية بصرية موسّعة، بيانات قانونية/
-- تعريفية، معلومات تواصل متعددة، حسابات بنكية متعددة، تواقيع متعددة حسب الدور.

alter table public.companies
  -- هوية بصرية موسّعة
  add column if not exists logo_white_url text,
  add column if not exists logo_black_url text,
  add column if not exists favicon_url text,
  add column if not exists document_logo_url text,
  add column if not exists cover_image_url text,
  add column if not exists client_portal_logo_url text,
  -- بيانات تعريفية
  add column if not exists name_en text,
  add column if not exists trade_name text,
  add column if not exists short_description text,
  add column if not exists about_text text,
  add column if not exists mission text,
  add column if not exists vision text,
  add column if not exists company_values text,
  add column if not exists business_activity text,
  add column if not exists establishment_number text,
  add column if not exists chamber_number text,
  add column if not exists founded_date date,
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists postal_code text,
  -- معلومات تواصل إضافية (email/phone/website/address موجودة أصلاً)
  add column if not exists finance_email text,
  add column if not exists support_email text,
  add column if not exists mobile_phone text,
  add column if not exists whatsapp_number text,
  -- تواقيع حسب الدور (signature_url الحالي = توقيع المدير الافتراضي تاريخياً)
  add column if not exists signature_executive_url text,
  add column if not exists signature_accountant_url text,
  add column if not exists signature_pm_url text,
  add column if not exists default_signature_key text not null default 'manager',
  -- تخصيص إضافي
  add column if not exists button_color text,
  add column if not exists alert_color text;

alter table public.companies drop constraint if exists companies_default_signature_key_check;
alter table public.companies add constraint companies_default_signature_key_check
  check (default_signature_key in ('manager', 'executive', 'accountant', 'project_manager'));

-- حسابات بنكية متعددة للشركة — حساب واحد افتراضي يُستخدم تلقائياً في الفواتير
-- والعقود (يُفرض بأن يبقى افتراضياً واحداً فقط عبر تريغر بدل الاعتماد على
-- تطبيق العميل وحده).
create table if not exists public.company_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  bank_name text not null,
  beneficiary_name text,
  account_number text,
  iban text,
  swift_code text,
  currency text not null default 'SAR',
  bank_logo_url text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.company_bank_accounts enable row level security;
create index if not exists idx_company_bank_accounts_company_id on public.company_bank_accounts(company_id);

create trigger touch_company_bank_accounts_updated_at before update on public.company_bank_accounts
  for each row execute function public.touch_updated_at();

create or replace function public.enforce_single_default_bank_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_default then
    update public.company_bank_accounts
      set is_default = false
      where company_id = new.company_id and id <> new.id and is_default = true;
  end if;
  return new;
end;
$$;

drop trigger if exists company_bank_accounts_single_default on public.company_bank_accounts;
create trigger company_bank_accounts_single_default before insert or update of is_default on public.company_bank_accounts
  for each row when (new.is_default) execute function public.enforce_single_default_bank_account();

create policy "أعضاء الشركة يرون حسابات شركتهم البنكية" on public.company_bank_accounts for select
  using (company_id = (select auth_company_id()));
create policy "مدير الشركة يدير حسابات شركته البنكية" on public.company_bank_accounts for all
  using (company_id = (select auth_company_id()) and (select is_company_admin()))
  with check (company_id = (select auth_company_id()) and (select is_company_admin()));
