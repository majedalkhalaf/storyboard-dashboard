-- نظام تحليلات نشاط العميل (المرحلة الأولى) — جدولان مستقلان عن أي نشاط
-- داخلي حالي (activity_logs الحالي خاص بسجل تغييرات المشروع، لا علاقة له
-- بتتبع تصفّح العميل نفسه): client_sessions لجلسات الدخول/الخروج وحالة
-- الاتصال المباشرة، وclient_activity_logs لكل حدث تصفّح تفصيلي (صفحة،
-- تحميل ملف، مشاهدة فيديو...). القراءة محصورة على أعضاء الشركة عبر RLS؛
-- الكتابة تمر حصراً عبر مسارات API بخادم service_role (نفس نمط باقي
-- مسارات بوابة العميل)، فلا حاجة لسياسة إدراج من العميل مباشرة.

create table if not exists public.client_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_seen_at timestamptz not null default now(),
  duration_seconds integer,
  device text,
  browser text,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists client_sessions_client_user_idx on public.client_sessions(client_user_id, started_at desc);
create index if not exists client_sessions_company_idx on public.client_sessions(company_id);
create index if not exists client_sessions_last_seen_idx on public.client_sessions(last_seen_at desc);

create table if not exists public.client_activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.client_sessions(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete cascade,
  event_type text not null check (event_type in ('login','logout','page_view','file_download','video_watch','error')),
  page text,
  action text,
  duration_seconds integer,
  metadata jsonb not null default '{}'::jsonb,
  device text,
  browser text,
  ip inet,
  created_at timestamptz not null default now()
);

create index if not exists client_activity_logs_client_user_idx on public.client_activity_logs(client_user_id, created_at desc);
create index if not exists client_activity_logs_company_idx on public.client_activity_logs(company_id, created_at desc);
create index if not exists client_activity_logs_project_idx on public.client_activity_logs(project_id);
create index if not exists client_activity_logs_episode_idx on public.client_activity_logs(episode_id);
create index if not exists client_activity_logs_event_type_idx on public.client_activity_logs(event_type);

alter table public.client_sessions enable row level security;
alter table public.client_activity_logs enable row level security;

-- أعضاء الشركة يقرؤون جلسات ونشاط عملائهم فقط (بلا كتابة مباشرة من الواجهة —
-- كل الإدراج/التحديث يمر عبر مسارات API بصلاحية service_role).
create policy "أعضاء الشركة يشاهدون جلسات عملائهم" on public.client_sessions for select
  using (company_id = (select public.auth_company_id()));

create policy "أعضاء الشركة يشاهدون نشاط عملائهم" on public.client_activity_logs for select
  using (company_id = (select public.auth_company_id()));

alter publication supabase_realtime add table public.client_sessions;
