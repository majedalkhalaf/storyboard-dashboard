-- طريقة الدفع كحقل مستقل على المصروف (بدل دمجها داخل نص التصنيف) — يخدم حقل
-- "طريقة الدفع" المطلوب صراحة في نموذج "إضافة مصروف جديد" المبسّط.
alter table public.expenses add column if not exists payment_method text;
