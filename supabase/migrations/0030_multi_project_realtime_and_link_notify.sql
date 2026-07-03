-- (1) يضيف project_clients و projects لنشرة supabase_realtime — بدونها لا تصل
-- أي أحداث Realtime لهذين الجدولين مهما اشترك العميل، وهو ما كان يمنع ظهور
-- مشروع جديد أو تحديث بيانات مشروع داخل بوابة العميل دون تحديث الصفحة يدوياً.
alter publication supabase_realtime add table public.project_clients;
alter publication supabase_realtime add table public.projects;

-- (2) إشعار تلقائي للعميل عند ربط مشروع جديد بحسابه (عند تفعيل صف project_clients) —
-- يعمل بصرف النظر عن نقطة الربط في الواجهة الداخلية (دعوة جديدة أو منح صلاحية لاحقاً).
create or replace function public.notify_client_on_project_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_name text;
begin
  if new.status = 'active' and new.client_user_id is not null
     and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    select name into v_project_name from public.projects where id = new.project_id;
    insert into notifications (user_id, company_id, project_id, episode_id, type, title, message)
    values (new.client_user_id, new.company_id, new.project_id, null, 'project_linked', 'مشروع جديد', 'تمت إضافة مشروع جديد إلى حسابك: ' || coalesce(v_project_name, ''));
  end if;
  return new;
end;
$$;

drop trigger if exists project_clients_notify_link on public.project_clients;
create trigger project_clients_notify_link after insert or update of status on public.project_clients
  for each row execute function public.notify_client_on_project_link();
