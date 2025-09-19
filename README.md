# Wedding Site

A full‑stack wedding website platform with a Vue 3 (Vite) frontend and an Express/Node.js backend. It provides RSVP management, content pages, guest messaging via email, media management, surveys, multilingual support, and an admin dashboard.

## Features

- Public site: pages, RSVP flow, guest surveys, countdown, multilingual (en/lt)
- Admin: dashboard, pages and media management, guest list + RSVPs, email messaging with templates and scheduling, survey builder, settings
- API: Swagger docs, cookie‑based auth, CORS, file uploads, background jobs

## Monorepo Layout

- `apps/backend`: Express API server, Knex migrations, jobs, routes, uploads
- `apps/frontend`: Vue 3 + Vite app, Pinia, UnoCSS, PrimeVue
- `apps/postmen-collections`: Postman collections for API testing
- `package.json`: npm workspaces for running frontend and backend together

## Requirements

- Node.js 18+
- npm
- Database:
  - MySQL (primary/production path)
  - SQLite (alternative/dev – limited tooling support)

## Getting Started

1) Install dependencies (from repo root):

```bash
npm install
```

2) Configure environment variables for the backend in `apps/backend/.env` (or `.env-production` for prod). Minimal dev example using SQLite:

```env
# apps/backend/.env
NODE_ENV=development
PORT=5001
DB_TYPE=sqlite
DB_PATH=./database.sqlite
SESSION_SECRET=replace-me
RSVP_SESSION_SECRET=replace-me
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=debug
```

For MySQL (recommended for production):

```env
# apps/backend/.env-production
NODE_ENV=production
PORT=5001
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_user
DB_PASS=your_pass
DB_NAME=wedding_site
SESSION_SECRET=replace-me
RSVP_SESSION_SECRET=replace-me
CORS_ORIGINS=https://yourdomain.com
RESEND_API_KEY=your-resend-api-key
SITE_URL=https://yourdomain.com
LOG_LEVEL=warn
```

3) Configure the frontend env in `apps/frontend/.env`:

```env
VITE_API_URL=http://localhost:5001/api
VITE_APP_TITLE=Brigita + Jeffrey
VITE_ENABLE_LOGS=false
```

## Database Setup

MySQL (primary path):

```bash
# Import baseline schema (creates DB and base tables)
npm run import:baseline --workspace apps/backend

# Run migrations
npm run migrate --workspace apps/backend

# Seed example data (users, guests, templates, etc.)
npm run seed:mysql --workspace apps/backend
```

SQLite (alternative/dev):

- Knex migrations in this repo target MySQL; for SQLite, initialize using `apps/backend/schema/sqlite_schema.sql` and use `DB_TYPE=sqlite`. Some scripts (e.g., seeders) are MySQL‑specific and won’t run against SQLite.

## Run in Development

From the repo root:

```bash
# Starts Vite (frontend) and Express (backend) concurrently
npm run dev
```

Individual workspaces:

```bash
npm run dev:frontend  # Vite at http://localhost:5173
npm run dev:backend   # Backend at http://localhost:5001
```

## Production Build & Start

```bash
# Build frontend
npm run build

# Start both (frontend preview + backend)
npm start
```

Notes:
- The root `start` script builds the frontend, runs its preview server, and starts the backend. In real deployments you’ll likely serve the built frontend via nginx and run the backend via a process manager (pm2/systemd).

## API

- Swagger/OpenAPI UI: `GET /api/docs` (backend must be running)
- Health check: `GET /api/health`
- Postman collections: `apps/postmen-collections/`

Key route groups (backend):
- `POST /api/login`, `POST /api/logout` (auth)
- `/api/admin/*` (protected admin routes)
- `/api/pages/*` (public page content)
- `/api/rsvp/*` (RSVP flow)
- `/api/guests/*` (guest management)
- `/api/surveys/*` (public surveys)
- `/api/settings/*` (email, guests, main)
- `/api/messages/*` (email messaging + stats)
- `/api/admin/images/*` (media management)

## Scripts (selected)

Root:
- `npm run dev`: run frontend and backend together
- `npm run build`: build frontend
- `npm start`: start preview + backend

Backend:
- `npm run dev`: nodemon backend
- `npm run migrate`: run Knex migrations
- `npm run import:baseline`: import MySQL baseline schema
- `npm run seed:mysql`: seed MySQL with sample data
- `npm run smoke-test`: basic API smoke tests

Frontend:
- `npm run dev`, `npm run build`, `npm run preview`

## Security & Ops Notes

- Configure CORS via `CORS_ORIGINS`
- Sessions use signed cookies; set strong `SESSION_SECRET` and `RSVP_SESSION_SECRET`
- File uploads are served under `/uploads` and `/api/uploads`
- Background scheduler runs inside the backend process (email scheduling)
- Logs are written to `apps/backend/logs/server.log`; consider log rotation in production

## Project Structure Reference

See `apps/frontend/README.md` for a deep dive into features, architecture, and improvement ideas. High‑level structure:

```
apps/
  backend/   # API, DB, jobs, routes, uploads
  frontend/  # Vue app (Vite, Pinia, UnoCSS, PrimeVue)
```

## Troubleshooting

- CORS errors: ensure the browser origin matches `CORS_ORIGINS`
- 500s on startup: verify DB settings and that the schema is initialized (MySQL: run import + migrate; SQLite: apply `schema/sqlite_schema.sql`)
- Missing Swagger docs: check the backend is running and reachable at `PORT`

## License

MIT

