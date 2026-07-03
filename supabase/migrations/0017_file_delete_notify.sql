-- ══════════════════════════════════════════════════════════════════════════
-- إشعار العميل عند حذف ملف كان مرئياً له — يُكمل trigger الإضافة الموجود مسبقاً
-- (notify_client_on_file_insert في 0015_files_upload_system.sql) بنفس منطق التحقق
-- تماماً (عميل نشط + صلاحية "files")، لكن قبل الحذف (before delete) لأن old.* لا
-- يبقى متاحاً بعد اكتمال الحذف. يضمن هذا أن الإشعار يعمل موحّداً بصرف النظر عن أي
-- مسار حذف مستقبلي (حذف فردي أو حذف دفعة من واجهة الملفات)، بدل الاعتماد على كل
-- نقطة حذف في الواجهة لإدراج الإشعار يدوياً.
--
-- ملاحظة تطبيق: هذا الملف مُضاف فقط، لا صلاحية تطبيق مباشرة على قاعدة بيانات حيّة من
-- هذه الجلسة — يحتاج من يملك صلاحية الوصول لتشغيله (supabase db push أو ما يعادله).
-- ══════════════════════════════════════════════════════════════════════════

create or replace function public.notify_client_on_file_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pc record;
begin
  if old.client_visible = true then
    for pc in
      select client_user_id from project_clients
      where project_id = old.project_id
        and status = 'active'
        and client_user_id is not null
        and coalesce((permissions ->> 'files')::boolean, false) = true
    loop
      insert into notifications (user_id, company_id, project_id, episode_id, type, title, message)
      values (pc.client_user_id, old.company_id, old.project_id, old.episode_id, 'file_deleted', 'تم حذف ملف', 'تم حذف الملف: ' || old.name);
    end loop;
  end if;
  return old;
end;
$$;

drop trigger if exists files_notify_client_delete on public.files;
create trigger files_notify_client_delete before delete on public.files
  for each row execute function public.notify_client_on_file_delete();
