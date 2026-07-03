-- ══════════════════════════════════════════════════════════════════════════
-- إعدادات مالية أساسية على مستوى الشركة: نسبة الضريبة الافتراضية، بادئة رقم
-- الفاتورة، ومهلة السداد الافتراضية بالأيام. تُستخدم كقيم مبدئية عند إنشاء
-- فواتير جديدة (لا تُطبَّق تلقائياً على مستندات موجودة).
-- ملاحظة: هذه الهجرة لم تُطبَّق على قاعدة البيانات بعد — لا توجد صلاحية وصول
-- لقاعدة بيانات فعلية في بيئة هذا الوكيل. يجب تطبيقها يدوياً من قِبل من يملك
-- صلاحية الوصول لمشروع Supabase قبل أن تعمل صفحة /finance/settings فعلياً.
-- ══════════════════════════════════════════════════════════════════════════

alter table public.companies add column if not exists default_tax_rate numeric not null default 15;
alter table public.companies add column if not exists invoice_number_prefix text not null default 'INV';
alter table public.companies add column if not exists default_payment_terms_days int not null default 30;
