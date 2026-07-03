-- صلاحية "storyboard" موجودة أصلاً في ClientPermissions منذ البداية، لكن لا توجد
-- سياسة RLS تتيح للعميل قراءة storyboard_scenes فعلياً — كانت الصلاحية بلا أي أثر
-- حقيقي. هذه السياسة تطابق نفس نمط سياسات العميل الأخرى (episodes/files/notes).
create policy "العميل يرى ستوري بورد حلقته إن سُمح له" on public.storyboard_scenes for select
  using (
    exists (
      select 1 from public.project_clients pc
      join public.episodes e on e.id = storyboard_scenes.episode_id
      where pc.project_id = e.project_id
        and pc.client_user_id = auth.uid()
        and pc.status = 'active'
        and coalesce((pc.permissions->>'storyboard')::boolean, false) = true
    )
  );
