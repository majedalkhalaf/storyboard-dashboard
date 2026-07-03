-- تحويل صفحة العملاء إلى مركز CRM حقيقي: حقول إضافية على العميل + قيمة فعلية للعقد
alter table public.clients add column if not exists client_type text not null default 'company'
  check (client_type in ('company', 'individual', 'agency'));
alter table public.clients add column if not exists city text;
alter table public.clients add column if not exists logo_url text;
alter table public.clients add column if not exists contact_name text;
alter table public.clients add column if not exists assigned_to uuid references public.profiles(id);
alter table public.clients add column if not exists status text not null default 'active'
  check (status in ('active', 'paused', 'completed', 'awaiting_reply'));

-- لا يوجد أي حقل رقمي لقيمة العقد حالياً (content jsonb فقط) — يلزم عمود حقيقي لعرض "قيمة العقود" في صفحة العملاء
alter table public.contracts add column if not exists amount numeric;

create index if not exists idx_clients_assigned_to on public.clients(assigned_to);
