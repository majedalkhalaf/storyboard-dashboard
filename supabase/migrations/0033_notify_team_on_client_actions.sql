-- حتى الآن كل triggers الإشعارات في النظام باتجاه واحد فقط (فريق العمل ←
-- العميل): notify_client_on_file_insert, notify_client_on_pipeline_stage_change,
-- notify_client_on_project_link. لا يوجد أي شيء يُشعر فريق العمل عندما يقوم
-- العميل بإجراء — وهذا سبب عدم وصول أي تنبيه عند إضافة العميل لملاحظة أو
-- اعتماده لحلقة. هذه الهجرة تضيف الاتجاه المعاكس لأهم إجراءين: ملاحظة جديدة
-- من العميل، واعتماد نهائي لحلقة.

create or replace function public.notify_team_on_client_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  v_project_name text;
begin
  if new.author_role = 'client' then
    select name into v_project_name from public.projects where id = new.project_id;
    for rec in
      select id from public.profiles
      where company_id = new.company_id and role in ('super_admin', 'company_owner', 'admin', 'team_member')
    loop
      insert into notifications (user_id, company_id, project_id, episode_id, type, title, message)
      values (rec.id, new.company_id, new.project_id, new.episode_id, 'client_note', 'ملاحظة جديدة من العميل', coalesce(v_project_name, '') || ' — ' || new.body);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists notes_notify_team_on_client on public.notes;
create trigger notes_notify_team_on_client after insert on public.notes
  for each row execute function public.notify_team_on_client_note();

create or replace function public.notify_team_on_client_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  v_episode_title text;
  v_project_name text;
begin
  select e.title, p.name into v_episode_title, v_project_name
  from public.episodes e join public.projects p on p.id = e.project_id
  where e.id = new.episode_id;

  for rec in
    select id from public.profiles
    where company_id = new.company_id and role in ('super_admin', 'company_owner', 'admin', 'team_member')
  loop
    insert into notifications (user_id, company_id, project_id, episode_id, type, title, message)
    values (rec.id, new.company_id, new.project_id, new.episode_id, 'episode_approved', 'اعتماد نهائي من العميل', coalesce(v_project_name, '') || ' — تم اعتماد حلقة: ' || coalesce(v_episode_title, ''));
  end loop;
  return new;
end;
$$;

drop trigger if exists approvals_notify_team on public.approvals;
create trigger approvals_notify_team after insert on public.approvals
  for each row execute function public.notify_team_on_client_approval();
