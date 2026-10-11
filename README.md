# TaskBoard — Trello Clone (Next.js Kanban)

Complete kanban project management: boards, lists, cards with drag-and-drop, labels, checklists, due dates, time logging, comments/activity feed, and a client progress dashboard. Local-first (localStorage) so it deploys to Vercel with zero config.

## Features
- **Boards**: create, favorite, archive/delete, gradient covers, search
- **Lists + Cards**: full drag-and-drop (lists + cards, cross-list moves)
- **Card details**: description, 6 labels, members, due dates (overdue/due-soon badges), checklists with %, comments (client-visible), time logs (hours + note + date), copy/archive/delete
- **Roles (local auth)**: `admin` (full + team mgmt), `member` (team), `client` (read-only boards + comment)
- **Client Progress dashboard** (`/dashboard`): % complete per board, hours logged, overdue counts, activity record, print/export
- **Team page** (`/users`, admin): change roles, share boards with clients
- **Persistence**: Zustand + localStorage (`kanban-storage-v1`), seeded demo data, reset button in navbar

## Demo accounts (password: `password`)
- `admin@example.com` — admin
- `member@example.com` — member
- `client@example.com` — client (read-only)

## Run locally
```bash
npm install
npm run dev
# open http://localhost:3000
```

## Publish on Vercel
Option A — from GitHub (recommended):
1. Commit + push this folder to GitHub (`kanban-board` repo).
2. Go to [vercel.com/new](https://vercel.com/new) → Import the repo.
3. Framework preset: **Next.js**. Build command: `npm run build`. Output: `.next`. No env vars needed.
4. Deploy. Every push to `main` redeploys automatically.

Option B — from CLI:
```bash
npx vercel        # link + preview deploy
npx vercel --prod # production deploy
```

## Notes / next upgrades
- Auth + data are **local demo only** (plain passwords in localStorage). For real multi-user: migrate store to Supabase/Postgres + NextAuth/Supabase Auth — the `src/lib/store.ts` action layer is already shaped for that swap.
- Moving a card to the last list auto-marks it complete (feeds the % dashboards).
