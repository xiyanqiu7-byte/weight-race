# 减脂对战 · 小白上线手册

目标：拿到一个手机能打开的链接，和朋友输入**同一句暗号**，就能实时同步（双人/多人都行）。

整件事只分两大块：

1. **Supabase**（免费云端数据库）— 存体重、饮食、挑衅  
2. **Vercel**（免费网站托管）— 把网页挂到网上  

> 中国大陆访问 Vercel 可能不稳定，需要国内直连时可再迁腾讯云/阿里云。

---

## 第 0 步：先约定好

- 各自选头像（男生/女生均可，可重复）
- 想好一句**暗号**（两边必须一字不差）

老项目升级（头像 3/4 + 排便打卡）请直接跑一次：

`supabase/migrate-all.sql`

（下面「小白专供」有完整复制粘贴版。退出房间删记录不需要 SQL。）

---

## 小白专供：一次性跑完数据库升级

只做这一件事就够了（大约 2 分钟）。**不用改网站代码。**

### 步骤

1. 浏览器打开：https://supabase.com/dashboard  
2. 登录后，点进你「减脂对战」用的那个项目  
3. 左侧点 **SQL Editor** → 再点 **New query**  
4. 把编辑器清空，粘贴下面**整段 SQL**（从第一行 `-- ===` 到最后一行 `end $$;`）  
5. 点绿色 **Run**（运行）  
6. 成功：出现 **Success** 或 `Success. No rows returned`  
7. 失败：把红色报错整段复制下来，回来发给我

### 要粘贴的整段 SQL

```sql
-- 一次性升级：头像 3/4 + 排便打卡

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
```

跑完 SQL **还不会**让网站立刻出现新功能——网站代码还要合并 PR 并同步到 Vercel。SQL 先跑完就行，回来找我同步 Vercel。

---

## 小白专供：修好「头像 3 / 4 进不去房间」

不用改网站代码。只要在 Supabase 里跑一段 SQL。大约 2 分钟。

### 1. 打开 Supabase

1. 浏览器打开：https://supabase.com/dashboard  
2. 登录（一般用 GitHub / Google 登录就行）  
3. 点进你给「减脂对战」用的那个项目（名字你自己当时起的）

### 2. 打开 SQL 编辑器

左侧菜单找到 **SQL Editor**（或「SQL」）→ 点 **New query**（新建查询）

### 3. 粘贴下面整段文字

把编辑器里原来的内容清空，然后**全部复制、全部粘贴**下面这一整段（从第一行 `-- 多人房间` 到最后一行分号，一个字都别漏）：

```sql
-- 多人房间 + 四个头像（a/b/c/d）
-- 在 Supabase → SQL Editor 执行本文件全部内容

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
```

### 4. 点绿色的 Run（运行）

- 成功：右下角或下方一般会显示 **Success** / 成功（有时写 `Success. No rows returned`，也正常）  
- 失败：把红色报错整段复制发给会看的人；常见是进错了项目，或表名不是 `profiles`

### 5. 回网站验证

1. 打开你的减脂对战网站  
2. 选**头像 3 或头像 4**  
3. 起昵称、输入暗号 → 点「进入房间」  
4. 能进去就修好了

> 不需要重新部署 Vercel。只改数据库规则即可。  
> 这段 SQL 多跑几次一般也没事。

---

## 本机 / 云端配置与部署

详见历史步骤摘要：

1. Supabase 建项目 → 执行 `schema.sql`（新项目）或再执行 `migrate-multi.sql`（老项目）  
2. 复制 Project URL + Publishable/anon key 到 `.env.local`  
3. `npm run dev` 本机验证  
4. `npx vercel --prod` 部署，并配置同名环境变量  

完整图文可继续参考本文件旧版操作习惯：SQL Editor、API Keys、`npx vercel env add`。

---

## 怎么玩

1. 打开网站链接  
2. 选头像、起昵称、输入同一暗号  
3. 录入起始体重  
4. 日常打卡；对战页看排行；想怼就挑衅  

---

## 常见问题

**Q：选头像 3 / 头像 4 时进入房间失败？**  
A：多半是早期建的表还在用 `slot in ('a','b')`。到 Supabase → SQL Editor 把 `supabase/migrate-multi.sql` 全文跑一遍即可（可重复执行）。

**Q：两个人都选同一个头像可以吗？**  
A：可以。头像只是皮肤，不再互斥。

**Q：会花钱吗？**  
A：免费额度通常够小圈子私用。别把 Secret / service_role 写进网站。
