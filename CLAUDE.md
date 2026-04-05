# CLAUDE.md — Karaoke Room Web App

## Quick Start

- Run `/hello` at session start for full onboarding
- Read `docs/DOCUMENTATION_GUIDE.md` for project context and protocols
- Check Docker container `karaoke-postgres` is running before any DB work

## Key Rules

- **Docker:** The user is not experienced with Docker. Handle all Docker commands yourself. Check `karaoke-postgres` container status proactively at session start.
- **Database:** PostgreSQL via Docker on port 5432. Connection: `postgresql://postgres:postgres@localhost:5432/karaoke`
- **Monorepo:** `server/` (Node.js backend), `client/` (React frontend — Phase 3+)
- **Spec:** Full plan in `karaoke-web-app-development-plan.md`, phase prompts in `WEB-PHASE-*-PROMPT.md`
- **No CORS:** Frontend and backend share same origin (Railway deployment)

## Dev Commands

```bash
npm run dev:server          # Start backend dev server
cd server && npx prisma migrate dev  # Run migrations
cd server && npx prisma studio       # DB GUI
docker start karaoke-postgres        # Start DB container
```
