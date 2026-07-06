alter table behind_scenes_posts add column episode_id uuid references episodes(id) on delete cascade;
create index if not exists behind_scenes_posts_episode_id_idx on behind_scenes_posts(episode_id);
