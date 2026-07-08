-- إلغاء إشعار العميل عند حذف الفريق لملف — بناءً على طلب صريح بعدم إشعار العميل
-- بأي عملية حذف (ملاحظات/تعليقات/ملفات/مرفقات). هذا هو المسار الوحيد في قاعدة
-- البيانات الذي كان يُنشئ إشعار حذف فعلياً؛ لا يوجد أي trigger مماثل لحذف
-- الملاحظات/التعليقات أصلاً (تأكيد عبر فحص information_schema.triggers).
-- سجل النشاط الداخلي لفريق العمل (activity_logs) غير متأثر — هذا خاص فقط
-- بإشعارات جدول notifications المرسلة للعميل.

drop trigger if exists files_notify_client_delete on public.files;
drop function if exists public.notify_client_on_file_delete();
