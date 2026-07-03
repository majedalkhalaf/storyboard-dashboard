-- مسؤول منفّذ لكل مرحلة تنفيذ على حدة (بدل الاكتفاء بالمسؤول العام عن الحلقة)
alter table public.episode_stages add column if not exists assigned_to uuid references public.profiles(id);
