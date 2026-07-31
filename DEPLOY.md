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

若你的项目是早期建的表，还需要在 Supabase SQL Editor 执行一次：

`supabase/migrate-multi.sql`

（取消「一间房只能一个男生一个女生」的限制）

若要开通「顺畅打卡 / 排便」，再执行一次：

`supabase/migrate-bowel.sql`

---

## 小白专供：开通「顺畅打卡」

1. 打开 https://supabase.com/dashboard → 点进你的项目  
2. 左侧 **SQL Editor** → **New query**  
3. 粘贴下面整段 → 点绿色 **Run**  
4. 看到 Success 即可；然后重新部署/刷新网站

```sql
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

**Q：两个人都选男生可以吗？**  
A：可以。头像只是皮肤，不再互斥。

**Q：会花钱吗？**  
A：免费额度通常够小圈子私用。别把 Secret / service_role 写进网站。
