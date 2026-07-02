-- تاريخ استحقاق اختياري لكل مرحلة تنفيذ — يغذي ودجت "المهام القادمة" في اللوحة الرئيسية
alter table public.episode_stages
  add column if not exists due_date date;

create index if not exists idx_episode_stages_due_date on public.episode_stages(due_date)
  where due_date is not null;
