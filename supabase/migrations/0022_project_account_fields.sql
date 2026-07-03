-- حقول إضافية لدعم نموذج "إضافة دفعة/مصروف" المبسّط داخل صفحة حساب المشروع
-- المستقل (/accounts/[projectId]) — رقم مرجع وملاحظات للدفعات (لم تكن موجودة أصلاً)،
-- ومرفق اختياري للمصروفات (payments.receipt_url موجود مسبقاً ويُستخدم لمرفق الدفعة).

alter table public.payments add column if not exists reference_number text;
alter table public.payments add column if not exists notes text;
alter table public.expenses add column if not exists attachment_url text;
