# Docker Setup — PostgreSQL for Karaoke Room App

## Prerequisites

- Docker Desktop installed and running on Windows
- User is not experienced with Docker — all Docker commands should be handled by the assistant

## Container Details

| Setting | Value |
|---------|-------|
| Container name | `karaoke-postgres` |
| Image | `postgres` (latest) |
| Host port | `5432` |
| Container port | `5432` |
| Database name | `karaoke` |
| Username | `postgres` |
| Password | `postgres` |

## Connection String

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/karaoke
```

## Session Startup Checklist

Run these checks at the start of every session:

### 1. Check if Docker Desktop is running

```bash
docker info > /dev/null 2>&1 && echo "Docker is running" || echo "Docker is NOT running"
```

If Docker is not running, tell the user to open Docker Desktop and wait for it to start.

### 2. Check if container exists

```bash
docker ps -a --filter name=karaoke-postgres --format "{{.Names}} {{.Status}}"
```

- If **no output**: container doesn't exist — create it (see below)
- If **status contains "Up"**: container is running, good to go
- If **status contains "Exited"**: container is stopped — start it

### 3. Create container (first time only)

```bash
docker run -d --name karaoke-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=karaoke postgres
```

### 4. Start stopped container

```bash
docker start karaoke-postgres
```

### 5. Verify database is accessible

```bash
docker exec karaoke-postgres pg_isready -U postgres
```

Expected output: `localhost:5432 - accepting connections`

## Troubleshooting

### Port 5432 already in use
Another PostgreSQL instance or service is using the port. Either stop that service or change the host port:
```bash
docker run -d --name karaoke-postgres -p 5433:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=karaoke postgres
```
Then update DATABASE_URL to use port 5433.

### Container won't start
```bash
docker logs karaoke-postgres
```
Check logs for errors. If corrupt, remove and recreate:
```bash
docker rm karaoke-postgres
docker run -d --name karaoke-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=karaoke postgres
```
Note: this deletes all data. Re-run migrations after.

### Reset database completely
```bash
docker stop karaoke-postgres
docker rm karaoke-postgres
docker run -d --name karaoke-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=karaoke postgres
cd server && npx prisma migrate dev
```
