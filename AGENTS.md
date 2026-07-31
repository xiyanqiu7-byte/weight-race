<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

This is a single Next.js 16 (App Router + Turbopack) PWA at the repo root — the weight-loss competition app "减脂对战 / WEIGHT RACE". The UI is entirely in Chinese.

- The `README.md` "快速开始" says `cd weight-race` first, but that directory does not exist; the project lives at the repo root. Run commands directly from the root.
- Standard commands are in `package.json`: `npm run dev` (dev server, port 3000), `npm run lint`, `npm run build`, `npm run start`. There is no automated test suite.
- The app runs in a self-contained **local mode** (browser `localStorage`, see `src/lib/local-db.ts`) whenever the Supabase env vars are unset — no database or extra services are needed to develop or test the full flow end-to-end. Cloud sync is optional and only activates when both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (see `src/lib/supabase.ts`); it requires an external Supabase project plus the SQL in `supabase/` (see `DEPLOY.md`).
- `npm run lint` currently reports pre-existing errors (`react-hooks/set-state-in-effect` in `src/hooks/useCouple.tsx`, `prefer-const` in `src/lib/api.ts`); these exist on the base branch and are unrelated to environment setup.
- The `scripts/` files are one-off maintenance utilities (avatar sheet processing, Supabase verification) and are not part of the dev workflow.
