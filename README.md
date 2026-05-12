# SegWitz Meeting & Decision Repository

Internal enterprise web application for SegWitz to record meetings, capture discussion summaries, register decisions with approvals, assign action items, attach evidence, and search historical operational records. **Frontend**: React (Vite), Tailwind CSS, shadcn-style UI primitives, TanStack Query, Axios, React Hook Form, Zod, Zustand, Recharts. **Backend**: Node.js, Express. **Data**: Supabase PostgreSQL, Supabase Auth, Supabase Storage (private `attachments` bucket).

---

## 1. Project overview

- **Monorepo layout**: `frontend/` (Vercel SPA), `backend/` (Render/Railway API), `supabase/migrations/` (SQL schema + RLS + storage bucket).
- **Auth**: Email/password via Supabase Auth; API verifies JWTs with the Supabase service role client (`auth.getUser`).
- **RBAC**: Roles stored in `roles`; each `profiles` row links to `auth.users` and a role. Express controllers enforce department / role rules (admin, management, department head, project manager, team member, view-only).
- **Core modules**: Meetings (draft/finalize), Decision register (status + history), Action items (priorities, overdue), attachments (upload/download/delete), global search, dashboard analytics, audit activity logs.

---

## 2. Local setup (quick start)

1. **Clone** this repository.
2. Create a **Supabase** project and note URL, anon key, and service role key.
3. Run **database migration** (see §6).
4. Copy **environment files** (§7) for `frontend/` and `backend/`.
5. Install dependencies and run **frontend** and **backend** (§3–4).

---

## 3. Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

- Default dev server: `http://localhost:5173`
- Vite proxies `/api` → `http://127.0.0.1:4000` (see `vite.config.ts`). If you set `VITE_API_URL` to your API origin (no path), the client calls `{VITE_API_URL}/api/...`.

**Production build**

```bash
npm run build
npm run preview   # optional local preview of dist/
```

---

## 4. Backend setup

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

- Listens on `PORT` (default **4000**).
- Health check: `GET /health`
- All JSON APIs are under `/api/...`.

**Production**

```bash
npm start
```

Set `NODE_ENV=production` on Render/Railway. Configure `FRONTEND_URL` for CORS.

---

## 5. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Authentication** → enable Email provider.
3. **SQL** → run `supabase/migrations/20240511000000_initial_schema.sql` (or use Supabase CLI migrations).
4. **Storage**: migration creates private bucket `attachments` with MIME allowlist (PDF, Office, ZIP, images).
5. **First user**: Sign up once (or create user in Auth UI). Trigger `handle_new_user` creates a `profiles` row with role `team_member`. Promote users by updating `profiles.role_id` (or use **Users** UI as Admin).

---

## 6. Database migration setup

**Option A — SQL Editor**

1. Open Supabase → SQL → New query.
2. Paste contents of `supabase/migrations/20240511000000_initial_schema.sql`.
3. Run.

**Option B — Supabase CLI**

```bash
supabase db push   # if linked project and migration copied to supabase/migrations
```

The migration creates enums, tables (`profiles`, `meetings`, `meeting_attendees`, `decisions`, `decision_status_history`, `action_items`, `attachments`, `activity_logs`), master **roles**, **divisions**, **departments**, RLS policies, storage bucket, and `on_auth_user_created` → `profiles` trigger.

---

## 7. Environment setup

**Frontend (`frontend/.env`)** — see `frontend/.env.example`

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_API_URL` | API origin without path, e.g. `http://127.0.0.1:4000` or `https://api.yourcompany.com` |

**Backend (`backend/.env`)** — see `backend/.env.example`

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Same project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (**server only**) |
| `JWT_SECRET` | Reserved for future custom signing; JWT verification uses Supabase |
| `PORT` | API port |
| `FRONTEND_URL` | Allowed CORS origin in production |

---

## 8. Vercel deployment (frontend)

1. Import Git repo in Vercel; set **root directory** to `frontend`.
2. Framework preset: **Vite**.
3. Build command: `npm run build`, output: `dist`.
4. Add env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (your deployed API origin, e.g. `https://segwitz-api.onrender.com`).
5. `vercel.json` includes SPA fallback rewrites so React Router works on refresh.

---

## 9. Render / Railway deployment (backend)

1. New **Web Service** from this repo; root directory `backend`.
2. Build: `npm install` (no separate build step required).
3. Start: `npm start`.
4. Set env vars from `backend/.env.example`.
5. Expose HTTPS URL and use it as `VITE_API_URL` on Vercel.

---

## 10. Production build steps (checklist)

1. Apply Supabase migration.
2. Configure Storage bucket policies if you bypass migration (must match app MIME types).
3. Deploy backend; verify `GET https://your-api/health`.
4. Deploy frontend with `VITE_API_URL` pointing at backend origin.
5. Smoke-test: login → dashboard → create meeting → finalize → add decision → action item → upload attachment → search.

---

## Seed / demo data

Master divisions and departments are inserted by the migration. **Sample users/meetings/decisions/actions** require real `auth.users` UUIDs. After creating users in Supabase Auth, you can:

```sql
UPDATE public.profiles SET role_id = (SELECT id FROM public.roles WHERE slug = 'admin' LIMIT 1)
WHERE email = 'you@company.com';
```

Then insert meetings/decisions referencing existing `profiles.id` values. A optional `supabase/seed.sql` can hold team-specific inserts once UUIDs are known.

---

## API map (summary)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/me` | Current user profile |
| GET/PATCH | `/api/users`, `/api/users/me`, `/api/users/:id` | Directory (admin) / self-service |
| GET | `/api/divisions`, `/api/departments`, `/api/roles` | Reference data |
| CRUD | `/api/meetings`, `/api/decisions`, `/api/action-items` | Pagination & filters |
| POST | `/api/meetings/:id/finalize`, `/api/decisions/:id/status` | Workflow |
| PUT | `/api/meetings/:id/attendees` | Replace attendees |
| POST/GET/DELETE | `/api/attachments` | Multipart upload; signed download |
| GET | `/api/dashboard/summary`, `/api/search` | Analytics & global search |

---

## Security notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` or service role in the browser.
- RLS is enabled; app data paths use the **service role** only after JWT verification in Express (bypasses RLS intentionally). Tighten policies if you add direct Supabase reads from the client.
- Rotate keys if leaked.

---

## License

Proprietary — SegWitz internal use unless otherwise agreed.
