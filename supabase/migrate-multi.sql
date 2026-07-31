-- 多人房间 + 四个头像（a/b/c/d）
-- 在 Supabase → SQL Editor 执行本文件全部内容
--
-- 适用：早期库只允许 slot in ('a','b')，或仍有 unique(couple_id, slot)
-- 症状：选头像 3 / 头像 4 时「进入房间」失败（check / unique 约束）

-- 1) 取消「一间房每个头像只能一人」
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

-- 2) 去掉一切限制 slot 取值的旧 check（名称不一定是 profiles_slot_check）
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
