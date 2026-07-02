-- قيود فريدة مطلوبة لعمليات upsert في مسار دعوة العميل (app/api/invites/create)

alter table public.clients
  add constraint clients_company_email_unique unique (company_id, email);

alter table public.project_clients
  add constraint project_clients_project_user_unique unique (project_id, client_user_id);
