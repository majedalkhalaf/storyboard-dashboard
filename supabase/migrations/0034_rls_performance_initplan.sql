-- إصلاح أداء: 65 سياسة RLS كانت تستدعي auth.uid()/auth_company_id()/
-- is_company_admin() مباشرة، مما يجعل Postgres يعيد تقييم الدالة لكل صف على
-- حدة (per-row re-evaluation) بدل تقييمها مرة واحدة فقط لكل استعلام
-- (InitPlan) — وهذا أبطأ بشكل كبير مع كبر حجم الجداول، وأثقلها بالضبط
-- الجداول التي تعتمد عليها بوابة العميل والتنقل بين المشاريع/الحلقات (files,
-- notes, episodes, episode_stages, approvals, invoices, payments, projects,
-- project_clients...). لفّ كل استدعاء بـ (select ...) هو إصلاح Supabase
-- الرسمي الموثّق لتحذير auth_rls_initplan — بلا أي تغيير في المنطق أو من
-- يُسمح له برؤية ماذا، فقط في متى تُحسَب الدالة.

alter policy "أعضاء الشركة يرون سجل نشاط شركتهم" on public.activity_logs
  using ((company_id = (select auth_company_id())));

alter policy "أعضاء الشركة يديرون اعتمادات مشار" on public.approvals
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "العميل يرى اعتماداته" on public.approvals
  using ((EXISTS ( SELECT 1 FROM project_clients pc WHERE ((pc.project_id = approvals.project_id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text)))));

alter policy "العميل يعتمد حلقة مشروعه إن سُمح ل" on public.approvals
  with check (((client_id = (select auth.uid())) AND (EXISTS ( SELECT 1 FROM project_clients pc WHERE ((pc.project_id = approvals.project_id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text) AND COALESCE(((pc.permissions ->> 'approve_episodes'::text))::boolean, false))))));

alter policy "أعضاء الشركة يرون الحسابات البنكي" on public.bank_accounts
  using ((company_id = (select auth_company_id())));

alter policy "مدير الشركة يدير الحسابات البنكية" on public.bank_accounts
  using (((company_id = (select auth_company_id())) AND (select is_company_admin())))
  with check (((company_id = (select auth_company_id())) AND (select is_company_admin())));

alter policy "أعضاء الشركة يرون حركات الحسابات ا" on public.bank_transactions
  using ((company_id = (select auth_company_id())));

alter policy "مدير الشركة يدير حركات الحسابات ال" on public.bank_transactions
  using (((company_id = (select auth_company_id())) AND (select is_company_admin())))
  with check (((company_id = (select auth_company_id())) AND (select is_company_admin())));

alter policy "أعضاء الشركة يديرون مسودات دعوات م" on public.client_invite_drafts
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "أعضاء الشركة يديرون سجل عملائهم" on public.clients
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "أعضاء الشركة يرون شركتهم" on public.companies
  using ((id = (select auth_company_id())));

alter policy "مدير الشركة يعدّل بيانات شركته" on public.companies
  using (((id = (select auth_company_id())) AND (select is_company_admin())))
  with check (((id = (select auth_company_id())) AND (select is_company_admin())));

alter policy "مدير الشركة يدير دعوات فريقه" on public.company_invites
  using (((company_id = (select auth_company_id())) AND (select is_company_admin())))
  with check (((company_id = (select auth_company_id())) AND (select is_company_admin())));

alter policy "أعضاء الشركة يديرون مراحل شركتهم" on public.company_pipeline_stages
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "أعضاء الشركة يرون الأرقام المرجعي" on public.company_sender_numbers
  using ((company_id = (select auth_company_id())));

alter policy "مدير الشركة يدير الأرقام المرجعية" on public.company_sender_numbers
  using (((company_id = (select auth_company_id())) AND (select is_company_admin())))
  with check (((company_id = (select auth_company_id())) AND (select is_company_admin())));

alter policy "أعضاء الشركة يرون عقود مشاريعهم" on public.contracts
  using ((company_id = (select auth_company_id())));

alter policy "العميل يرى عقود مشروعه إن سُمح له" on public.contracts
  using ((EXISTS ( SELECT 1 FROM project_clients pc WHERE ((pc.project_id = contracts.project_id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text) AND COALESCE(((pc.permissions ->> 'contracts'::text))::boolean, false)))));

alter policy "مدير الشركة يدير عقود مشاريعه" on public.contracts
  using (((company_id = (select auth_company_id())) AND (select is_company_admin())))
  with check (((company_id = (select auth_company_id())) AND (select is_company_admin())));

alter policy "أعضاء الشركة يديرون نسخ سكربت حلقا" on public.episode_script_versions
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "أعضاء الشركة يديرون مراحل حلقاتهم" on public.episode_stages
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "العميل يرى مراحل الحلقة إن سُمح له" on public.episode_stages
  using ((EXISTS ( SELECT 1 FROM (episodes e JOIN project_clients pc ON ((pc.project_id = e.project_id))) WHERE ((e.id = episode_stages.episode_id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text) AND COALESCE(((pc.permissions ->> 'execution_phases'::text))::boolean, false)))));

alter policy "أعضاء الشركة يديرون حلقات مشاريعه" on public.episodes
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "العميل يرى حلقات مشروعه إن سُمح له" on public.episodes
  using ((EXISTS ( SELECT 1 FROM project_clients pc WHERE ((pc.project_id = episodes.project_id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text) AND COALESCE(((pc.permissions ->> 'episodes'::text))::boolean, false)))));

alter policy "أعضاء الشركة يديرون معداتهم" on public.equipment
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "مدير الشركة يدير مصروفات مشاريعه" on public.expenses
  using (((company_id = (select auth_company_id())) AND (select is_company_admin())))
  with check (((company_id = (select auth_company_id())) AND (select is_company_admin())));

alter policy "أعضاء الشركة يديرون ملفات مشاريعه" on public.files
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "العميل يرفع مرفقات إن سُمح له" on public.files
  with check (((EXISTS ( SELECT 1 FROM project_clients pc WHERE ((pc.project_id = files.project_id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text) AND COALESCE(((pc.permissions ->> 'upload_attachments'::text))::boolean, false)))) AND (uploaded_by = (select auth.uid()))));

alter policy "العميل يرى الملفات المتاحة له فقط" on public.files
  using (((client_visible = true) AND (EXISTS ( SELECT 1 FROM project_clients pc WHERE ((pc.project_id = files.project_id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text) AND COALESCE(((pc.permissions ->> 'files'::text))::boolean, false))))));

alter policy "أعضاء الشركة يرون التصنيفات المال" on public.financial_categories
  using ((company_id = (select auth_company_id())));

alter policy "مدير الشركة يدير التصنيفات المالي" on public.financial_categories
  using (((company_id = (select auth_company_id())) AND (select is_company_admin())))
  with check (((company_id = (select auth_company_id())) AND (select is_company_admin())));

alter policy "مدير الشركة يرى سجل الدعوات" on public.invitations
  using (((company_id = (select auth_company_id())) AND (select is_company_admin())));

alter policy "أعضاء الشركة يرون فواتير مشاريعهم" on public.invoices
  using ((company_id = (select auth_company_id())));

alter policy "العميل يرى فواتير مشروعه إن سُمح ل" on public.invoices
  using ((EXISTS ( SELECT 1 FROM project_clients pc WHERE ((pc.project_id = invoices.project_id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text) AND COALESCE(((pc.permissions ->> 'invoices'::text))::boolean, false)))));

alter policy "مدير الشركة يدير فواتير مشاريعه" on public.invoices
  using (((company_id = (select auth_company_id())) AND (select is_company_admin())))
  with check (((company_id = (select auth_company_id())) AND (select is_company_admin())));

alter policy "أعضاء الشركة يديرون كل ملاحظات مشا" on public.notes
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "العميل يرى ملاحظات مشروعه" on public.notes
  using ((EXISTS ( SELECT 1 FROM project_clients pc WHERE ((pc.project_id = notes.project_id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text)))));

alter policy "العميل يضيف ملاحظة إن سُمح له" on public.notes
  with check (((author_id = (select auth.uid())) AND (EXISTS ( SELECT 1 FROM project_clients pc WHERE ((pc.project_id = notes.project_id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text) AND COALESCE(((pc.permissions ->> CASE WHEN (notes.parent_note_id IS NULL) THEN 'add_notes'::text ELSE 'reply_notes'::text END))::boolean, false))))));

alter policy "كل مستخدم يدير إشعاراته فقط" on public.notifications
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy "أعضاء الشركة يرون دفعات مشاريعهم" on public.payments
  using ((company_id = (select auth_company_id())));

alter policy "العميل يرى دفعات مشروعه إن سُمح له" on public.payments
  using ((EXISTS ( SELECT 1 FROM project_clients pc WHERE ((pc.project_id = payments.project_id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text) AND COALESCE(((pc.permissions ->> 'payments'::text))::boolean, false)))));

alter policy "مدير الشركة يدير دفعات مشاريعه" on public.payments
  using (((company_id = (select auth_company_id())) AND (select is_company_admin())))
  with check (((company_id = (select auth_company_id())) AND (select is_company_admin())));

alter policy "المستخدم يعدّل ملفه الشخصي فقط" on public.profiles
  using ((id = (select auth.uid())));

alter policy "المستخدم يقرأ ملفه الشخصي" on public.profiles
  using ((id = (select auth.uid())));

alter policy "زملاء الشركة يرون بعضهم" on public.profiles
  using (((company_id IS NOT NULL) AND (company_id = (select auth_company_id()))));

alter policy "أعضاء الشركة يرون صلاحيات عملاء مش" on public.project_clients
  using ((company_id = (select auth_company_id())));

alter policy "العميل يرى صف صلاحياته الخاص فقط" on public.project_clients
  using ((client_user_id = (select auth.uid())));

alter policy "مدير الشركة يدير صلاحيات عملاء مشا" on public.project_clients
  using (((company_id = (select auth_company_id())) AND (select is_company_admin())))
  with check (((company_id = (select auth_company_id())) AND (select is_company_admin())));

alter policy "المستخدم يدير مفضّلاته فقط" on public.project_favorites
  using (((user_id = (select auth.uid())) AND (company_id = (select auth_company_id()))))
  with check (((user_id = (select auth.uid())) AND (company_id = (select auth_company_id()))));

alter policy "أعضاء الشركة يديرون عروض مشاريعهم" on public.project_presentations
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "أعضاء الشركة يديرون خدمات مشاريعه" on public.project_services
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "العميل يرى خدمات مشروعه" on public.project_services
  using ((EXISTS ( SELECT 1 FROM project_clients pc WHERE ((pc.project_id = project_services.project_id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text)))));

alter policy "أعضاء الشركة يديرون قوالبهم" on public.project_templates
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "أعضاء الشركة يديرون مشاريعهم" on public.projects
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "العميل يرى فقط المشاريع المصرَّح ل" on public.projects
  using ((EXISTS ( SELECT 1 FROM project_clients pc WHERE ((pc.project_id = projects.id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text)))));

alter policy "أعضاء الشركة يرون عروض مشاريعهم" on public.proposals
  using ((company_id = (select auth_company_id())));

alter policy "العميل يرى عروض مشروعه إن سُمح له" on public.proposals
  using (((project_id IS NOT NULL) AND (EXISTS ( SELECT 1 FROM project_clients pc WHERE ((pc.project_id = proposals.project_id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text) AND COALESCE(((pc.permissions ->> 'proposals'::text))::boolean, false))))));

alter policy "مدير الشركة يدير عروض مشاريعه" on public.proposals
  using (((company_id = (select auth_company_id())) AND (select is_company_admin())))
  with check (((company_id = (select auth_company_id())) AND (select is_company_admin())));

alter policy "أعضاء الشركة يديرون طاقم مشاهد ستو" on public.storyboard_scene_cast
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "أعضاء الشركة يديرون معدات مشاهد ست" on public.storyboard_scene_equipment
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "أعضاء الشركة يديرون مشاهد ستوري بو" on public.storyboard_scenes
  using ((company_id = (select auth_company_id())))
  with check ((company_id = (select auth_company_id())));

alter policy "العميل يرى ستوري بورد حلقته إن سُم" on public.storyboard_scenes
  using ((EXISTS ( SELECT 1 FROM (project_clients pc JOIN episodes e ON ((e.id = storyboard_scenes.episode_id))) WHERE ((pc.project_id = e.project_id) AND (pc.client_user_id = (select auth.uid())) AND (pc.status = 'active'::text) AND (COALESCE(((pc.permissions ->> 'storyboard'::text))::boolean, false) = true)))));

alter policy "كل مستخدم يدير تفضيلاته فقط" on public.user_settings
  using ((user_id = (select auth.uid())))
  with check ((user_id = (select auth.uid())));

alter policy "أعضاء الشركة يرون الموردين" on public.vendors
  using ((company_id = (select auth_company_id())));

alter policy "مدير الشركة يدير الموردين" on public.vendors
  using (((company_id = (select auth_company_id())) AND (select is_company_admin())))
  with check (((company_id = (select auth_company_id())) AND (select is_company_admin())));
