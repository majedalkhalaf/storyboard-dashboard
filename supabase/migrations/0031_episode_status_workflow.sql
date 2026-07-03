-- إصلاح جذري لعطل في مسار اعتماد الحلقة بالكامل: لا يوجد في أي مكان بالتطبيق
-- الداخلي ما يضبط episodes.status = 'ready_for_approval' (تحقّقنا بالبحث في كل
-- الكود)، فزر "اعتماد نهائي للحلقة" في بوابة العميل — الذي يظهر فقط عند
-- status = 'ready_for_approval' — لا يظهر أبداً مهما بلغت نسبة الإنجاز. كذلك
-- لا يوجد ما يرفع الحالة تلقائياً من "لم يبدأ" رغم أن progress > 0 فعلياً
-- (نفس نمط الأعطال السابقة: حقول تُقرأ في كل مكان لكن لا شيء يكتبها).

-- (1) ترقية تلقائية لحالة الحلقة إلى "قيد التنفيذ" بمجرد أن تتجاوز نسبة إنجازها
-- صفراً وهي لا تزال "لم يبدأ" — لا تُغيَّر أي حالة أخرى (in_review/ready_for_approval/
-- معتمدة/مسلَّمة) فهذه يتحكم بها الفريق يدوياً عن قصد.
create or replace function public.recompute_episode_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_episode_id uuid;
  v_avg numeric;
begin
  v_episode_id := coalesce(new.episode_id, old.episode_id);
  select coalesce(avg(progress), 0) into v_avg from public.episode_stages where episode_id = v_episode_id;
  update public.episodes
    set progress = round(v_avg),
        status = case when status = 'not_started' and round(v_avg) > 0 then 'in_progress' else status end
    where id = v_episode_id;
  return null;
end;
$$;

-- (2) عند اعتماد العميل فعلياً (إدراج صف في approvals)، تُضبط حالة الحلقة على
-- "معتمدة" تلقائياً (ما لم تكن مُسلَّمة أصلاً) — بدل بقائها على حالتها السابقة
-- إلى الأبد رغم الاعتماد الفعلي.
create or replace function public.mark_episode_approved_from_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.episodes set status = 'approved' where id = new.episode_id and status <> 'delivered';
  return new;
end;
$$;

drop trigger if exists approvals_mark_episode_approved on public.approvals;
create trigger approvals_mark_episode_approved after insert on public.approvals
  for each row execute function public.mark_episode_approved_from_approval();

-- (3) تصحيح فوري للحلقات الحالية العالقة على "لم يبدأ" رغم إنجاز فعلي > 0،
-- بدل انتظار أول تعديل مستقبلي على مراحلها.
update public.episodes set status = 'in_progress' where status = 'not_started' and progress > 0;
