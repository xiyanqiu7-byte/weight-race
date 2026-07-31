-- ============================================================
-- 减脂对战 · 一次性升级脚本（小白专用）
-- 把下面从第一行到最后一行，全部复制进 Supabase SQL Editor → Run
-- 可重复执行；成功一般会显示 Success / Success. No rows returned
--
-- 包含：
--   1) 放开头像 3 / 4（slot a/b/c/d）
--   2) 新建排便打卡表 bowel_logs
-- 不包含：「退出房间删记录」——那只改网站代码，不用 SQL
-- ============================================================

-- ---------- 1) 四个头像 ----------
alter table profiles drop constraint if exists profiles_couple_id_slot_key;

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'profiles'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ~* 'couple_id'
      and pg_get_constraintdef(c.oid) ~* 'slot'
  loop
    execute format('alter table profiles drop constraint %I', r.conname);
  end loop;
end $$;

do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'profiles'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ~* 'slot'
  loop
    execute format('alter table profiles drop constraint %I', r.conname);
  end loop;
end $$;

alter table profiles drop constraint if exists profiles_slot_check;
alter table profiles
  add constraint profiles_slot_check check (slot in ('a', 'b', 'c', 'd'));

-- ---------- 2) 排便打卡 ----------
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

do $$
begin
  alter publication supabase_realtime add table bowel_logs;
exception
  when duplicate_object then null;
end $$;
