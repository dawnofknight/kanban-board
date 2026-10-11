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

## Data & hosting: Cloudflare Workers + D1

Boards, cards, comments, time logs and activity live in **Cloudflare D1** (SQLite, never sleeps).
Auth is D1 users + httpOnly cookie sessions with bcrypt password hashes. Roles from before
(`admin` / `member` / `client`) are enforced server-side — clients can only read + comment.

### Run locally (with local D1, no account needed)
```bash
pnpm install
pnpm db:migrate:local                              # create tables in local D1
pnpm dlx wrangler d1 execute kanban-board-db --local --file=db/seed.sql   # demo data
pnpm dev                                           # open http://localhost:3000
```
Demo logins (password: `password`): `admin@example.com`, `member@example.com`, `client@example.com`.

> Local D1 state is keyed by `database_id`: if you change it in `wrangler.jsonc`,
> re-run migrate + seed with `--local` to refill the new local database.
> Next.js is pinned to 16.3.x — the OpenNext adapter has an unreleased upstream bug
> with 16.4 (`preview-props.json` loadManifest crash, upstream PR #1356).

### Publish on Cloudflare (one-time setup)
```bash
pnpm dlx wrangler login                            # browser OAuth, needs a Cloudflare account
pnpm dlx wrangler d1 create kanban-board-db        # copy the database_id into wrangler.jsonc
pnpm db:migrate:remote                             # create tables in production D1
node db/seed.mjs && pnpm dlx wrangler d1 execute kanban-board-db --remote --file=db/seed.sql
pnpm deploy                                        # build + deploy the Worker
```
Every subsequent deploy is just `pnpm deploy`. Or connect the GitHub repo in the
Cloudflare dashboard (Workers → Create → connect repo, build command `pnpm deploy`-equivalent:
`opennextjs-cloudflare build && opennextjs-cloudflare deploy`) for auto-deploys on push.

## Notes / next upgrades
- Auth + data are **local demo only** (plain passwords in localStorage). For real multi-user: migrate store to Supabase/Postgres + NextAuth/Supabase Auth — the `src/lib/store.ts` action layer is already shaped for that swap.
- Moving a card to the last list auto-marks it complete (feeds the % dashboards).
