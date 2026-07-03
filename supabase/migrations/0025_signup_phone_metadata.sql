-- تسجيل حساب العميل المستقل (client-signup) يجمع رقم الجوال ضمن user_metadata —
-- كانت handle_new_user() تتجاهله فتُفقَد القيمة رغم أن عمود profiles.phone موجود
-- أصلاً منذ البداية. يبقى السلوك الافتراضي (company_owner بلا role صريح) كما هو.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'company_owner'),
    new.raw_user_meta_data->>'phone'
  );
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
