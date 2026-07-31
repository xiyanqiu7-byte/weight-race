-- 减脂对战 · 一键建表（支持双人/多人同一暗号进房）
-- 在 Supabase 控制台 → SQL Editor → New query → 粘贴全部 → Run

-- 房间（输入同一句暗号匹配到同一房间）
create table if not exists couples (
  id uuid primary key default gen_random_uuid(),
  passphrase_hash text not null unique,
  created_at timestamptz not null default now()
);

-- 选手档案（slot = 头像 a/b/c/d，同一房间可多人同头像）
-- 若表已存在且仍是旧 check('a','b')，请另跑 migrate-multi.sql，本文件不会改已有表
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  slot text not null check (slot in ('a', 'b', 'c', 'd')),
  nickname text not null,
  start_weight_kg numeric(6, 2),
  start_date date,
  goal_kg numeric(6, 2) not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 体重记录（内部统一 kg）
create table if not exists weigh_ins (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  logged_on date not null,
  weight_kg numeric(6, 2) not null,
  created_at timestamptz not null default now(),
  unique (profile_id, logged_on)
);

-- 饮食记录
create table if not exists meal_logs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  logged_on date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  healthy boolean not null,
  created_at timestamptz not null default now(),
  unique (profile_id, logged_on, meal)
);

-- 训练记录
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  logged_on date not null,
  intensity text not null check (intensity in ('none', 'light', 'medium', 'high')),
  created_at timestamptz not null default now(),
  unique (profile_id, logged_on)
);

-- 挑衅表情
create table if not exists pokes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  from_profile_id uuid not null references profiles(id) on delete cascade,
  to_profile_id uuid not null references profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now()
);

-- 排便打卡（happened = 今天有没有顺利出货）
create table if not exists bowel_logs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  logged_on date not null,
  happened boolean not null,
  created_at timestamptz not null default now(),
  unique (profile_id, logged_on)
);

create index if not exists idx_weigh_ins_couple on weigh_ins(couple_id, logged_on);
create index if not exists idx_meal_logs_couple on meal_logs(couple_id, logged_on);
create index if not exists idx_workouts_couple on workouts(couple_id, logged_on);
create index if not exists idx_pokes_couple on pokes(couple_id, created_at desc);
create index if not exists idx_bowel_logs_couple on bowel_logs(couple_id, logged_on);

-- 小圈子应用：开放匿名读写（靠暗号哈希隔离房间，勿公开分享链接和暗号）
alter table couples enable row level security;
alter table profiles enable row level security;
alter table weigh_ins enable row level security;
alter table meal_logs enable row level security;
alter table workouts enable row level security;
alter table pokes enable row level security;
alter table bowel_logs enable row level security;

create policy "anon_all_couples" on couples for all to anon using (true) with check (true);
create policy "anon_all_profiles" on profiles for all to anon using (true) with check (true);
create policy "anon_all_weigh_ins" on weigh_ins for all to anon using (true) with check (true);
create policy "anon_all_meal_logs" on meal_logs for all to anon using (true) with check (true);
create policy "anon_all_workouts" on workouts for all to anon using (true) with check (true);
create policy "anon_all_pokes" on pokes for all to anon using (true) with check (true);
create policy "anon_all_bowel_logs" on bowel_logs for all to anon using (true) with check (true);

-- Realtime：对方一改你这边自动刷新
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table weigh_ins;
alter publication supabase_realtime add table meal_logs;
alter publication supabase_realtime add table workouts;
alter publication supabase_realtime add table pokes;
alter publication supabase_realtime add table bowel_logs;
