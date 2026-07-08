-- بطلب صريح: نصوص بعض ملاحظات/تعليقات العملاء كانت تحتوي على "&nbsp;" الحرفية
-- (غالباً ناتجة عن أداة تحويل صوت-لنص أو لصق من مصدر خارجي) بدل مسافة فعلية،
-- فتظهر للمستخدم ككود HTML خام بدل مسافة. نعالجها عند الحفظ (INSERT/UPDATE) بدل
-- كل موضع عرض على حدة، لأن نص الملاحظة (new.body) يُنسخ حرفياً داخل رسائل
-- الإشعارات أيضاً عبر triggers لاحقة (AFTER INSERT) — تنظيفه هنا مبكراً (BEFORE)
-- يضمن نظافته في كل مكان يُعرض فيه لاحقاً، بما في ذلك رسالة الإشعار نفسها.

create or replace function public.sanitize_note_body()
returns trigger
language plpgsql
as $function$
begin
  if new.body is not null then
    new.body := replace(new.body, '&nbsp;', ' ');
    new.body := replace(new.body, '&amp;', '&');
    new.body := replace(new.body, '&lt;', '<');
    new.body := replace(new.body, '&gt;', '>');
    new.body := replace(new.body, '&quot;', '"');
    new.body := replace(new.body, '&#39;', '''');
    new.body := replace(new.body, '&apos;', '''');
    -- إزاحة المسافات المزدوجة الناتجة عن استبدال &nbsp; بمسافة عادية
    new.body := regexp_replace(new.body, '[ \t]{2,}', ' ', 'g');
    new.body := btrim(new.body);
  end if;
  return new;
end;
$function$;

drop trigger if exists notes_sanitize_body on public.notes;
create trigger notes_sanitize_body
  before insert or update on public.notes
  for each row execute function public.sanitize_note_body();

-- تنظيف الصفوف المخزَّنة مسبقاً (ملاحظات وإشعارات) — التعديل الجديد أعلاه
-- يمنع تكرار المشكلة مستقبلاً فقط، فلا يُصلح النصوص الموجودة أصلاً بأثر رجعي.
update public.notes
set body = btrim(regexp_replace(replace(body, '&nbsp;', ' '), '[ \t]{2,}', ' ', 'g'))
where body ~ '&[a-zA-Z#0-9]+;';

update public.notifications
set message = btrim(regexp_replace(replace(message, '&nbsp;', ' '), '[ \t]{2,}', ' ', 'g'))
where message ~ '&[a-zA-Z#0-9]+;';
