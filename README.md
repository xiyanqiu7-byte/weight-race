# 减脂对战

好友减脂比赛 PWA：用同一句暗号匹配房间（双人/多人都行），记录体重 / 饮食 / 训练，对战页实时比拼，先减 **5 kg** 者胜。

## 快速开始（本机）

```bash
cd weight-race
npm install
npm run dev
```

打开 http://localhost:3000  

未配置 Supabase 时为**本地模式**。双人/多人云端同步请看 [DEPLOY.md](./DEPLOY.md)。

## 技术栈

- Next.js App Router + Tailwind CSS
- Supabase（可选）+ Realtime
- PWA manifest（可添加到主屏幕）

## 目录要点

- `supabase/schema.sql` — 云端建表脚本
- `supabase/migrate-multi.sql` — 已有库升级为多人房间
- `src/app/enter` — 昵称 / 头像 / 暗号
- `src/app/(app)/battle|record|trends|report` — 四个主页面
- `.env.local.example` — 环境变量模板
