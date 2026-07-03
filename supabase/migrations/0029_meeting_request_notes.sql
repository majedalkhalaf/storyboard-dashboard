-- يضيف "meeting" كقيمة صالحة لـ notes.target_type — يُستخدم لتمثيل طلبات
-- الاجتماع التي يرسلها العميل من بوابته (لا يوجد جدول اجتماعات/جدولة فعلي بعد،
-- فطلب الاجتماع هو ملاحظة حقيقية بمستوى المشروع يراها فريق العمل في نفس قائمة
-- الملاحظات الداخلية، بدل اختراع بيانات وهمية لجدول لا وجود له).
alter table public.notes drop constraint notes_target_type_check;
alter table public.notes add constraint notes_target_type_check
  check (target_type in ('project', 'episode', 'video', 'image', 'file', 'script', 'scenario', 'storyboard', 'meeting'));
