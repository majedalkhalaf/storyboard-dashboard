-- اكتُشف أن منشور supabase_realtime لا يحوي أي جدول إطلاقاً (فحص فعلي عبر
-- pg_publication_tables) — يعني كل اشتراكات Realtime في التطبيق (بما فيها جرس
-- إشعارات العميل الموجود مسبقاً) لم تكن تستقبل أي حدث فعلي منذ البداية. تُضاف هنا
-- الجداول التي تعتمد عليها ميزات حية فعلية في الكود.
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.episodes;
alter publication supabase_realtime add table public.episode_stages;
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.files;
