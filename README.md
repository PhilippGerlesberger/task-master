# Task Master

## Prerequisites

- Node.js 22+
- Corepack enabled (`corepack enable`)
- pnpm (managed through Corepack)
- Docker + Docker Compose (for PostgreSQL setup)

## Install dependencies

```bash
pnpm install
```

## Environment setup

1. Copy [.env.example](./.env.example) to `.env`.
2. Adjust values as needed.

Key variables:

- `PERSISTENCE=json|postgres`
- `DATABASE_URL` (required when `PERSISTENCE=postgres`)
- `DATABASE_URL_TEST` (used by PostgreSQL test suite)

## First-time PostgreSQL setup

1. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

2. Generate Prisma client:

   ```bash
   pnpm --filter @app/backend run db:generate
   ```

3. Apply migrations:

   ```bash
   pnpm --filter @app/backend run db:deploy
   ```

4. Start backend:

   ```bash
   pnpm --filter @app/backend run dev
   ```

## Persistence switch

- `PERSISTENCE=json` (default): uses [JsonBacklogRepository](./apps/backend/src/infrastructure/repositories/JsonBacklogRepository.ts)
- `PERSISTENCE=postgres`: uses [PostgresBacklogRepository](./apps/backend/src/infrastructure/repositories/PostgresBacklogRepository.ts) and ensures Inbox exists on startup

## Running tests

### Without PostgreSQL suite

If `DATABASE_URL_TEST` is not set, PostgreSQL tests are skipped automatically:

```bash
pnpm --filter @app/backend exec vitest run
```

### With PostgreSQL suite

Set `DATABASE_URL_TEST` to a reachable test database, then run:

```bash
pnpm --filter @app/backend exec vitest run
```

`tests/globalSetup.ts` applies `prisma migrate deploy` to `DATABASE_URL_TEST` before tests.

## Import existing JSON data into PostgreSQL

Run once after enabling `PERSISTENCE=postgres`:

```bash
pnpm --filter @app/backend run db:import-json
```

- Refuses to import if target DB already contains lists/tasks.
- Use `--force` to overwrite snapshot:

  ```bash
  pnpm --filter @app/backend run db:import-json -- --force
  ```

## Docker Compose backend + postgres

Start full stack:

```bash
docker compose up -d
```

- Backend service runs `prisma migrate deploy` before `start`.
- Backend uses host `postgres` in `DATABASE_URL`.

## Curl smoke test (PostgreSQL persistence)

1. Create list:

   ```bash
   curl -X POST http://localhost:4000/lists ^
     -H "Content-Type: application/json" ^
     -d "{\"title\":\"Inbox\"}"
   ```

2. Create task (replace `<LIST_ID>`):

   ```bash
   curl -X POST http://localhost:4000/tasks ^
     -H "Content-Type: application/json" ^
     -d "{\"title\":\"Ship release\",\"listIds\":[\"<LIST_ID>\"]}"
   ```

3. Update task status (replace `<TASK_ID>`):

   ```bash
   curl -X PATCH http://localhost:4000/tasks/<TASK_ID>/status ^
     -H "Content-Type: application/json" ^
     -d "{\"status\":\"DONE\"}"
   ```

4. Restart backend:

   ```bash
   docker compose restart backend
   ```

5. Verify data persists:

   ```bash
   curl http://localhost:4000/tasks
   ```

## Documentation

- Generate API docs:

  ```bash
  pnpm docs:generate
  ```

- Output directory: [docs/api](./docs/api/)
