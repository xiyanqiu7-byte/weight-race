-- 排便打卡表
-- 在 Supabase → SQL Editor 执行本文件全部内容（可重复执行）

create table if not exists bowel_logs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  logged_on date not null,
  happened boolean not null,
  created_at timestamptz not null default now(),
  unique (profile_id, logged_on)
);

create index if not exists idx_bowel_logs_couple on bowel_logs(couple_id, logged_on);

alter table bowel_logs enable row level security;

drop policy if exists "anon_all_bowel_logs" on bowel_logs;
create policy "anon_all_bowel_logs" on bowel_logs for all to anon using (true) with check (true);

-- Realtime：打卡后其他人日历也能刷新（若已加过会报错，可忽略）
do $$
begin
  alter publication supabase_realtime add table bowel_logs;
exception
  when duplicate_object then null;
end $$;
