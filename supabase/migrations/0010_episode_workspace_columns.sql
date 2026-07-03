-- تعليقات مرتبطة بلحظة زمنية داخل الفيديو (أسلوب Frame.io) — عمود اختياري على
-- notes، يُستخدم فقط عندما يكون target_type = 'video'.
alter table public.notes add column if not exists video_timestamp_seconds numeric;

-- حقول إضافية على الحلقة: مدة (تُدخل يدوياً، لا يوجد استخراج تلقائي من الفيديو)،
-- المسؤول عن الحلقة، وتواريخ تصوير/تسليم خاصة بالحلقة (قد تختلف عن تواريخ المشروع العامة).
alter table public.episodes add column if not exists duration_seconds integer;
alter table public.episodes add column if not exists assigned_to uuid references public.profiles(id);
alter table public.episodes add column if not exists shooting_date date;
alter table public.episodes add column if not exists delivery_date date;

-- سجل نسخ السكربت/السيناريو — لقطة (snapshot) صريحة عند الضغط على "حفظ نسخة"،
-- وليست عند كل حفظ تلقائي (لتفادي إغراق الجدول).
create table if not exists public.episode_script_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  episode_id uuid not null references public.episodes(id) on delete cascade,
  field text not null check (field in ('script', 'scenario')),
  content text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.episode_script_versions enable row level security;

create index if not exists idx_episode_script_versions_episode
  on public.episode_script_versions(episode_id, field, created_at desc);

create policy "أعضاء الشركة يديرون نسخ سكربت حلقاتهم" on public.episode_script_versions for all
  using (company_id = public.auth_company_id())
  with check (company_id = public.auth_company_id());
