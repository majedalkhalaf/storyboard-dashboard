-- تقصير رسائل إشعارات الردود/الملاحظات — كانت تحمل معلومات زائدة (كود المشروع،
-- عنوان الحلقة الكامل، التاريخ والوقت بالضبط) قبل نص الملاحظة الفعلي، بطلب
-- صريح باختصارها وتقليل هذه المعلومات. الوقت أصلاً معروض بشكل نسبي في الواجهة
-- بشكل منفصل، واسم المشروع معروض كوسم (#) في بوابة العميل فلا داعٍ لتكراره.
-- تبقى الرسالة بصيغة "سياق مختصر\nنص الملاحظة" (سطر واحد فقط قبل \n) كي تستطيع
-- الواجهة فصل السياق عن نص الملاحظة الفعلي وإبرازه بشكل مختلف بصرياً.

create or replace function public.notify_team_on_client_note()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  rec record;
  v_project_name text;
  v_client_id uuid;
  v_client_name text;
  v_episode_number int;
  v_title text;
  v_location text;
begin
  if new.author_role <> 'client' then
    return new;
  end if;

  select p.name, p.client_id into v_project_name, v_client_id
  from public.projects p where p.id = new.project_id;

  if v_client_id is not null then
    select c.name into v_client_name from public.clients c where c.id = v_client_id;
  end if;

  if new.episode_id is not null then
    select e.number into v_episode_number from public.episodes e where e.id = new.episode_id;
  end if;

  v_title := case
    when new.parent_note_id is not null then 'ردّ جديد من العميل'
    when new.target_type = 'meeting' then 'طلب اجتماع جديد من العميل'
    when new.request_type is not null then 'طلب تعديل جديد'
    else 'ملاحظة جديدة من العميل'
  end;

  v_location := coalesce(v_project_name, 'مشروع')
    || case when v_episode_number is not null then ' — الحلقة ' || v_episode_number else '' end
    || case when v_client_name is not null then ' — ' || v_client_name else '' end;

  for rec in
    select id from public.profiles
    where company_id = new.company_id and role in ('super_admin', 'company_owner', 'admin', 'team_member')
  loop
    insert into notifications (user_id, company_id, project_id, episode_id, note_id, type, title, message)
    values (rec.id, new.company_id, new.project_id, new.episode_id, new.id, 'client_note', v_title, v_location || E'\n' || new.body);
  end loop;
  return new;
end;
$function$;

create or replace function public.notify_client_on_team_note()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  rec record;
  v_episode_number int;
  v_title text;
  v_location text;
begin
  if new.author_role = 'client' then
    return new;
  end if;

  if new.target_type not in ('project', 'episode', 'video', 'meeting') then
    return new;
  end if;

  if new.episode_id is not null then
    select e.number into v_episode_number from public.episodes e where e.id = new.episode_id;
  end if;

  v_title := case
    when new.parent_note_id is not null then 'ردّ جديد من فريق العمل'
    else 'تحديث جديد من فريق العمل'
  end;

  -- اسم المشروع لا يُكرَّر هنا لأن بوابة العميل تعرضه أصلاً كوسم (#) فوق كل إشعار.
  v_location := case when v_episode_number is not null then 'الحلقة ' || v_episode_number else null end;

  for rec in
    select distinct client_user_id from public.project_clients
    where project_id = new.project_id and status = 'active' and client_user_id is not null
  loop
    insert into notifications (user_id, company_id, project_id, episode_id, note_id, type, title, message)
    values (
      rec.client_user_id, new.company_id, new.project_id, new.episode_id, new.id, 'team_note', v_title,
      case when v_location is not null then v_location || E'\n' else '' end || new.body
    );
  end loop;
  return new;
end;
$function$;
