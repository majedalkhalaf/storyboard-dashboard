-- ══════════════════════════════════════════════════════════════════════════
-- تشديد أمني بعد فحص Supabase Advisors — Migration 0002
-- ══════════════════════════════════════════════════════════════════════════

set check_function_bodies = off;

-- 1) touch_updated_at كان بدون search_path ثابت
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) log_activity: يجب أن يتحقق أن company_id تخص المستخدم فعلاً (منع حقن سجلات وهمية)
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
  if auth.uid() is null or p_company_id is distinct from public.auth_company_id() then
    raise exception 'غير مصرح بتسجيل نشاط لهذه الشركة';
  end if;
  select role into v_role from public.profiles where id = auth.uid();
  insert into public.activity_logs (company_id, project_id, episode_id, actor_id, actor_role, action, details)
  values (p_company_id, p_project_id, p_episode_id, auth.uid(), v_role, p_action, p_details)
  returning id into v_id;
  return v_id;
end;
$$;

-- 3) create_company_and_owner: رفض الاستدعاء بدون مصادقة
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
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;

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

-- 4) دوال داخلية بحتة (triggers) — لا حاجة لتعريضها كـ RPC عام
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.recompute_episode_progress() from public, anon, authenticated;

-- 5) notify_user: يُستدعى فقط من السيرفر بصلاحية service_role، وليس من العميل مباشرة
revoke execute on function public.notify_user(uuid, uuid, uuid, uuid, text, text, text) from public, anon, authenticated;

-- 6) auth_company_id / auth_role / is_company_admin: دوال مساعدة قراءة فقط للمستخدم
--    الحالي نفسه — استخدامها كـ RPC آمن (لا تكشف بيانات غير المستخدم نفسه) فنُبقيها كما هي.
