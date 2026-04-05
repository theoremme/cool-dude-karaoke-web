# Documentation Guide — Karaoke Room Web App

This file is read by the `/hello` onboarding skill at the start of each session. Follow all instructions here before proceeding with session work.

## Project Overview

Collaborative karaoke web app — host creates a room, friends join from phones, everyone adds songs, one main display plays videos. Built as a monorepo deploying to Railway.

- **Repo root:** `C:/ai/cool-dude-karaoke-web/`
- **Backend:** `server/` — Node.js, Express, Socket.io, Prisma, PostgreSQL
- **Frontend:** `client/` — React, Tailwind, Vite (Phase 3+)
- **Spec:** `karaoke-web-app-development-plan.md` (root)
- **Phase prompts:** `WEB-PHASE-*-PROMPT.md` (root)

## Development Environment

### Docker (PostgreSQL)

The database runs in Docker. The user is not experienced with Docker — **handle all Docker commands yourself** without requiring user intervention.

**Standard commands:**

```bash
# Check if container is running
docker ps --filter name=karaoke-postgres

# Start existing stopped container
docker start karaoke-postgres

# Create fresh container (only if none exists)
docker run -d --name karaoke-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=karaoke postgres

# Stop container
docker stop karaoke-postgres

# View logs
docker logs karaoke-postgres
```

**On session start:** Always check if `karaoke-postgres` container exists and is running. Start it if stopped. Only create a new one if it doesn't exist. See `/docs/docker-setup.md` for details.

### Environment File

Located at `server/.env` (not committed). Required vars:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Random hex string for JWT signing
- `YOUTUBE_API_KEY` — YouTube Data API v3 key
- `NODE_ENV` — `development` or `production`
- `PORT` — Default 3000

### Running the Server

```bash
# From repo root
npm run dev:server

# Or directly
cd server && npm run dev
```

### Database Migrations

```bash
cd server && npx prisma migrate dev --name <migration_name>
```

## Working Protocols

1. **Docker management:** Handle all Docker commands for the user. Check container status proactively.
2. **Major changes:** Propose significant code changes before implementing.
3. **Service management:** After code changes that require restart, prompt the user or handle restart.
4. **Q&A priority:** Answer all user questions before implementing other decisions.
5. **Documentation:** Update changelog after significant work. Update `next-session-notes.md` at session end.

## Documentation Files

| File | Purpose |
|------|---------|
| `docs/DOCUMENTATION_GUIDE.md` | This file — onboarding reference |
| `docs/docker-setup.md` | Docker/PostgreSQL setup details |
| `docs/code-changelog/` | Session changelogs |
| `docs/next-session-notes.md` | Handoff notes between sessions |
| `karaoke-web-app-development-plan.md` | Full project spec |
| `WEB-PHASE-*-PROMPT.md` | Phase-specific build prompts |
