-- المسارات الوحيدة التي تمرّر role صراحة عبر user_metadata هي: تسجيل الشركة
-- (company_owner) ودعوات العملاء (client عبر inviteUserByEmail). أي مستخدم
-- جديد بلا role في البيانات الوصفية (حالياً فقط تسجيل الدخول عبر Google/Microsoft)
-- هو بالتعريف صاحب شركة جديدة يُكمل الإعداد عبر /onboarding، وليس عميلاً أبداً.
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
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'company_owner')
  );
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
