-- ══════════════════════════════════════════════════════════════════════════
-- "تغيير المرحلة" السريع: حقل منفصل تماماً عن نظام episode_stages التفصيلي
-- الحالي (10 مراحل تحسب episodes.progress تلقائياً من متوسط حالاتها عبر trigger
-- موجود مسبقاً) — بقرار صريح من المستخدم، حتى لا نكسر أي شيء مبني على النظام
-- القديم (لوحات التحكم، تقارير الأداء، العرض الفني...). هذا حقل إضافي سريع
-- لعرض "أين تقف الحلقة الآن" بمرحلة واحدة مختصرة، قابلة للتخصيص لكل شركة.
-- ══════════════════════════════════════════════════════════════════════════

alter table public.episodes add column if not exists pipeline_stage text not null default 'planning';

-- قائمة مراحل قابلة للتخصيص لكل شركة من الإعدادات (بدل قيمة ثابتة مقفلة بالكود)
create table if not exists public.company_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  key text not null,
  label text not null,
  color text not null default '#6B7280',
  notify_client boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (company_id, key)
);

alter table public.company_pipeline_stages enable row level security;

create policy "أعضاء الشركة يديرون مراحل شركتهم" on public.company_pipeline_stages for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());

-- إنشاء المراحل الافتراضية الـ13 لكل شركة موجودة حالياً
insert into public.company_pipeline_stages (company_id, key, label, color, notify_client, sort_order)
select c.id, s.key, s.label, s.color, s.notify_client, s.sort_order
from public.companies c
cross join (values
  ('planning', 'تخطيط', '#6B7280', false, 0),
  ('script', 'كتابة سكربت', '#F59E0B', false, 1),
  ('storyboard', 'Storyboard', '#F59E0B', false, 2),
  ('ready_to_shoot', 'جاهز للتصوير', '#3B82F6', false, 3),
  ('shooting', 'تصوير', '#3B82F6', false, 4),
  ('file_transfer', 'نقل الملفات', '#3B82F6', false, 5),
  ('editing', 'مونتاج', '#F59E0B', false, 6),
  ('internal_review', 'مراجعة داخلية', '#06B6D4', false, 7),
  ('awaiting_client', 'بانتظار العميل', '#06B6D4', true, 8),
  ('revisions', 'تعديلات', '#F59E0B', true, 9),
  ('approved', 'معتمد', '#1DB954', true, 10),
  ('delivered', 'مسلم', '#10B981', true, 11),
  ('archived', 'مؤرشف', '#6B7280', false, 12)
) as s(key, label, color, notify_client, sort_order)
on conflict (company_id, key) do nothing;

-- تحديث دالة إنشاء الشركة لتضيف نفس المراحل الافتراضية للشركات الجديدة مستقبلاً
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

  return v_company_id;
end;
$$;

-- إشعار تلقائي للعميل عند تغيير المرحلة إلى مرحلة تهمّه (notify_client = true للمرحلة الجديدة)
create or replace function public.notify_client_on_pipeline_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  stage_label text;
  should_notify boolean;
  pc record;
begin
  if new.pipeline_stage is distinct from old.pipeline_stage then
    select label, notify_client into stage_label, should_notify
    from public.company_pipeline_stages
    where company_id = new.company_id and key = new.pipeline_stage;

    if should_notify then
      for pc in
        select client_user_id from project_clients
        where project_id = new.project_id
          and status = 'active'
          and client_user_id is not null
          and coalesce((permissions ->> 'episodes')::boolean, false) = true
      loop
        insert into notifications (user_id, company_id, project_id, episode_id, type, title, message)
        values (pc.client_user_id, new.company_id, new.project_id, new.id, 'episode_stage_changed', 'تحديث على الحلقة',
                'تحديث حالة الحلقة "' || new.title || '" إلى: ' || coalesce(stage_label, new.pipeline_stage));
      end loop;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists episodes_notify_pipeline_stage on public.episodes;
create trigger episodes_notify_pipeline_stage after update on public.episodes
  for each row execute function public.notify_client_on_pipeline_stage_change();
