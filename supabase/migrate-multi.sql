-- 多人房间 + 四个头像
-- 在 Supabase → SQL Editor 执行

alter table profiles drop constraint if exists profiles_couple_id_slot_key;

alter table profiles drop constraint if exists profiles_slot_check;
alter table profiles
  add constraint profiles_slot_check check (slot in ('a', 'b', 'c', 'd'));
