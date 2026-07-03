-- ══════════════════════════════════════════════════════════════════════════
-- تحسين نظام رفع الملفات: بيانات وصفية غنية لكل ملف، إشعار تلقائي للعميل عند
-- رفع ملف مرئي له، وتوسعة قائمة التصنيفات لتشمل design وproject_file.
--
-- قرار معماري مهم: لم يُنشأ bucket منفصل جديد ("production-files") كما هو
-- مطروح، بل استمر استخدام bucket "project-files" الموجود أصلاً — لأنه بالفعل
-- خاص (private) ومحكوم بسياسات RLS صحيحة (راجع 0001_init_multi_tenant.sql)،
-- والوصول إليه من طرف العميل يتم حصراً عبر app/api/client-portal/files/[fileId]
-- بمسار service_role بعد تحقق يدوي من صلاحيات project_clients — وليس عبر أي
-- سياسة RLS مباشرة على storage.objects (لا توجد أصلاً سياسة كهذه، وهذا مقصود
-- وموثّق في 0001). إنشاء bucket ثانٍ بنفس خصائص الأمان تماماً كان سيضاعف سطح
-- السياسات المُدارة بلا أي فائدة فعلية، ويحتاج ترحيل كل الملفات المرفوعة سابقاً.
-- عمود bucket_name أدناه يجعل النظام جاهزاً لدعم أكثر من bucket مستقبلاً بلا
-- كسر أي شيء إن استُدعت الحاجة فعلاً.
-- ══════════════════════════════════════════════════════════════════════════

alter table public.files
  add column if not exists original_name text,
  add column if not exists mime_type text,
  add column if not exists file_extension text,
  add column if not exists bucket_name text not null default 'project-files',
  add column if not exists uploaded_by_role text,
  add column if not exists client_can_view boolean not null default true,
  add column if not exists client_can_download boolean not null default true,
  add column if not exists is_public boolean not null default false,
  add column if not exists version integer not null default 1,
  add column if not exists status text not null default 'ready',
  add column if not exists thumbnail_url text,
  add column if not exists preview_url text,
  add column if not exists duration_seconds numeric,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.files drop constraint if exists files_category_check;
alter table public.files add constraint files_category_check
  check (category = any (array['image', 'video', 'document', 'audio', 'archive', 'design', 'project_file', 'link', 'other']));

alter table public.files drop constraint if exists files_status_check;
alter table public.files add constraint files_status_check
  check (status = any (array['uploading', 'ready', 'failed']));

drop trigger if exists files_touch_updated_at on public.files;
create trigger files_touch_updated_at before update on public.files
  for each row execute function public.touch_updated_at();

-- إشعار تلقائي لكل عميل نشط لديه صلاحية "files" عند إضافة ملف مرئي له —
-- trigger بدل استدعاء يدوي من كل نقطة رفع في الواجهة، حتى يعمل بشكل موحّد
-- ومضمون بصرف النظر عن أي مسار رفع مستقبلي.
create or replace function public.notify_client_on_file_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pc record;
begin
  if new.client_visible = true then
    for pc in
      select client_user_id from project_clients
      where project_id = new.project_id
        and status = 'active'
        and client_user_id is not null
        and coalesce((permissions ->> 'files')::boolean, false) = true
    loop
      insert into notifications (user_id, company_id, project_id, episode_id, type, title, message)
      values (pc.client_user_id, new.company_id, new.project_id, new.episode_id, 'file_uploaded', 'ملف جديد', 'تمت إضافة ملف جديد: ' || new.name);
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists files_notify_client on public.files;
create trigger files_notify_client after insert on public.files
  for each row execute function public.notify_client_on_file_insert();
