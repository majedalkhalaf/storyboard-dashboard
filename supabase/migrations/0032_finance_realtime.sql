-- يضيف invoices و payments لنشرة supabase_realtime — لازمة لمزامنة صفحة
-- "الحسابات" في بوابة العميل لحظياً مع أي فاتورة/دفعة يضيفها أو يعدّلها فريق
-- العمل من لوحة الشركة، دون حاجة العميل لتحديث الصفحة يدوياً.
alter publication supabase_realtime add table public.invoices;
alter publication supabase_realtime add table public.payments;
