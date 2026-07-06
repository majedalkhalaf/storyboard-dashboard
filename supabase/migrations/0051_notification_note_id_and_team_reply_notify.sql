-- عمود note_id على notifications: يسمح بالانتقال المباشر من أي إشعار متعلق بملاحظة/طلب
-- تعديل إلى مكانها بالضبط داخل صفحة الحلقة/المشروع، بدل الانتقال لأعلى الصفحة فقط.
alter table notifications add column note_id uuid references notes(id) on delete cascade;
create index if not exists notifications_note_id_idx on notifications(note_id);

-- نفس notify_team_on_client_note الحالية بالضبط، فقط مع تمرير note_id الآن.
create or replace function notify_team_on_client_note()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  rec record;
  v_project_name text;
  v_project_code text;
  v_client_id uuid;
  v_client_name text;
  v_episode_number int;
  v_episode_title text;
  v_title text;
  v_location text;
  v_when text;
begin
  if new.author_role <> 'client' then
    return new;
  end if;

  select p.name, p.code, p.client_id into v_project_name, v_project_code, v_client_id
  from public.projects p where p.id = new.project_id;

  if v_client_id is not null then
    select c.name into v_client_name from public.clients c where c.id = v_client_id;
  end if;

  if new.episode_id is not null then
    select e.number, e.title into v_episode_number, v_episode_title
    from public.episodes e where e.id = new.episode_id;
  end if;

  v_title := case
    when new.parent_note_id is not null then 'ردّ جديد من العميل'
    when new.target_type = 'meeting' then 'طلب اجتماع جديد من العميل'
    when new.request_type is not null then 'طلب تعديل جديد'
    else 'ملاحظة جديدة من العميل'
  end;

  v_location := coalesce(v_project_name, 'مشروع')
    || case when v_project_code is not null then ' (' || v_project_code || ')' else '' end
    || case when v_episode_number is not null then ' — الحلقة ' || v_episode_number || case when v_episode_title is not null then ': ' || v_episode_title else '' end else '' end
    || case when new.stage_label is not null then ' — مرحلة: ' || new.stage_label else '' end;

  v_when := to_char(new.created_at at time zone 'Asia/Riyadh', 'YYYY-MM-DD الساعة HH24:MI');

  for rec in
    select id from public.profiles
    where company_id = new.company_id and role in ('super_admin', 'company_owner', 'admin', 'team_member')
  loop
    insert into notifications (user_id, company_id, project_id, episode_id, note_id, type, title, message)
    values (
      rec.id, new.company_id, new.project_id, new.episode_id, new.id, 'client_note', v_title,
      v_location
        || case when v_client_name is not null then ' — العميل: ' || v_client_name else '' end
        || ' — ' || v_when || E'\n' || new.body
    );
  end loop;
  return new;
end;
$function$;

-- جديدة بالكامل: إشعار العميل عندما يكتب فريق العمل ملاحظة/رداً ضمن نفس مسار طلبات
-- التعديل الذي يراه العميل فعلياً (target_type التي تعرضها بوابة العميل حصراً — وليس
-- ملاحظات السكربت/الستوري بورد/السيناريو الداخلية التي لا واجهة للعميل لعرضها أصلاً).
create or replace function notify_client_on_team_note()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  rec record;
  v_project_name text;
  v_project_code text;
  v_episode_number int;
  v_episode_title text;
  v_title text;
  v_location text;
  v_when text;
begin
  if new.author_role = 'client' then
    return new;
  end if;

  if new.target_type not in ('project', 'episode', 'video', 'meeting') then
    return new;
  end if;

  select p.name, p.code into v_project_name, v_project_code
  from public.projects p where p.id = new.project_id;

  if new.episode_id is not null then
    select e.number, e.title into v_episode_number, v_episode_title
    from public.episodes e where e.id = new.episode_id;
  end if;

  v_title := case
    when new.parent_note_id is not null then 'ردّ جديد من فريق العمل'
    else 'تحديث جديد من فريق العمل'
  end;

  v_location := coalesce(v_project_name, 'مشروع')
    || case when v_project_code is not null then ' (' || v_project_code || ')' else '' end
    || case when v_episode_number is not null then ' — الحلقة ' || v_episode_number || case when v_episode_title is not null then ': ' || v_episode_title else '' end else '' end;

  v_when := to_char(new.created_at at time zone 'Asia/Riyadh', 'YYYY-MM-DD الساعة HH24:MI');

  for rec in
    select distinct client_user_id from public.project_clients
    where project_id = new.project_id and status = 'active' and client_user_id is not null
  loop
    insert into notifications (user_id, company_id, project_id, episode_id, note_id, type, title, message)
    values (
      rec.client_user_id, new.company_id, new.project_id, new.episode_id, new.id, 'team_note', v_title,
      v_location || ' — ' || v_when || E'\n' || new.body
    );
  end loop;
  return new;
end;
$function$;

create trigger notes_notify_client_on_team
  after insert on notes
  for each row execute function notify_client_on_team_note();
