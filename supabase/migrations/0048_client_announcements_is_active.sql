-- يسمح لفريق العمل بإيقاف عرض إعلان مؤقتاً للعميل دون حذفه نهائياً — بدل
-- الخيار الوحيد المتاح سابقاً (حذف الإعلان أو تركه حتى انتهاء مدته).
alter table public.client_announcements
  add column is_active boolean not null default true;
