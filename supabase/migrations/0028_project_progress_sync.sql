-- projects.progress لم يكن يُعاد حسابه تلقائياً أبداً من إنجاز حلقاته (بعكس
-- episodes.progress نفسها، المحسوبة تلقائياً من متوسط episode_stages عبر
-- recompute_episode_progress() الموجودة مسبقاً) — يبقى القيمة الافتراضية 0 أو ما
-- أُدخل يدوياً عند الإنشاء، بينما بعض الواجهات (ProjectHeaderBar) تحسب متوسطاً حياً
-- من الحلقات للعرض فقط دون كتابته، وواجهات أخرى (بطاقة قائمة المشاريع، وبوابة
-- العميل) تعرض العمود الثابت مباشرة — ينتج عنه رقمان مختلفان لنفس المشروع في نفس
-- اللحظة. هذا التريغر يجعل العمود نفسه محدَّثاً تلقائياً دائماً، فيتطابق كل مكان.
create or replace function public.recompute_project_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_avg numeric;
begin
  v_project_id := coalesce(new.project_id, old.project_id);
  select coalesce(avg(progress), 0) into v_avg from public.episodes where project_id = v_project_id;
  update public.projects set progress = round(v_avg) where id = v_project_id;
  return null;
end;
$$;

create trigger episodes_recompute_project_progress
  after insert or update of progress or delete on public.episodes
  for each row execute function public.recompute_project_progress();

-- تصحيح فوري لكل المشاريع الحالية التي لديها حلقات، بدل الانتظار حتى أول تعديل حلقة
update public.projects p
set progress = round(coalesce((select avg(e.progress) from public.episodes e where e.project_id = p.id), p.progress))
where exists (select 1 from public.episodes e where e.project_id = p.id);
