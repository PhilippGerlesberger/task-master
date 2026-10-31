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

After pulling new changes, regenerate the Prisma client:

```bash
pnpm --filter @app/backend run db:generate
```

## Environment setup

1. Copy [.env.example](./.env.example) to `.env` at the repository root.
2. Adjust values as needed.

The backend automatically loads env files from:

1. `apps/backend/.env`
2. `<repo-root>/.env` (without overriding already-set variables)

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

## Persistence switch (`PERSISTENCE`)

- `PERSISTENCE=json` (default): uses [JsonBacklogRepository](./apps/backend/src/infrastructure/repositories/JsonBacklogRepository.ts)
- `PERSISTENCE=postgres`: uses [PostgresBacklogRepository](./apps/backend/src/infrastructure/repositories/PostgresBacklogRepository.ts) and ensures Inbox exists on startup

## Inbox behaviour

- Exactly one inbox list exists with id `INBOX_LIST_ID`.
- It can be renamed, but it cannot be deleted, archived, or moved under another list.
- Creating a task without `listIds` automatically assigns the task to the inbox.

## Running tests

Run all workspace tests once (non-watch mode):

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

### Backend tests without PostgreSQL suite

If `DATABASE_URL_TEST` is not set (or does not target a `*_test` database), PostgreSQL tests are skipped automatically:

```bash
pnpm --filter @app/backend exec vitest run
```

### Backend tests with PostgreSQL suite

1. Start PostgreSQL:

   ```bash
   docker compose up -d postgres
   ```

2. Set `DATABASE_URL_TEST` in the root `.env` to a reachable database ending in `_test`.
3. Run backend tests:

```bash
pnpm --filter @app/backend exec vitest run
```

`tests/globalSetup.ts` applies `prisma migrate deploy` to `DATABASE_URL_TEST` before tests.

> Note: CI currently does not run the PostgreSQL-backed test suite.

## Docker Compose backend + postgres

Start full stack:

```bash
docker compose up -d
```

- Backend service runs `prisma migrate deploy` before `start`.
- Backend uses host `postgres` in `DATABASE_URL`.

## Curl smoke test (PostgreSQL persistence)

1. Create a task without `listIds`:

   ```bash
   curl -X POST http://localhost:4000/tasks ^
     -H "Content-Type: application/json" ^
     -d "{\"title\":\"Ship release\"}"
   ```

2. Verify lists include the inbox:

   ```bash
   curl http://localhost:4000/lists
   ```

3. Verify deleting the inbox is rejected (returns HTTP 400):

   ```bash
   curl -X DELETE http://localhost:4000/lists/11111111-1111-4111-8111-111111111111
   ```

4. Update task status (replace `<TASK_ID>`):

   ```bash
   curl -X PATCH http://localhost:4000/tasks/<TASK_ID>/status ^
     -H "Content-Type: application/json" ^
     -d "{\"status\":\"DONE\"}"
   ```

5. Restart backend:

   ```bash
   docker compose restart backend
   ```

6. Verify data persists:

   ```bash
   curl http://localhost:4000/tasks
   ```

## Documentation

- Generate API docs:

  ```bash
  pnpm docs:generate
  ```

- Output directory: [docs/api](./docs/api/)
