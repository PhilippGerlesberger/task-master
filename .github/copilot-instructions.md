# Project instructions

## Stack and commands
- pnpm monorepo. Backend in apps/backend: Node, TypeScript (strict), ESM with NodeNext,
  Fastify, Zod, Vitest. Relative imports must end in `.js`.
- Typecheck: `pnpm --filter @app/backend typecheck`
- Tests (single run, never watch mode): `pnpm --filter @app/backend exec vitest run`
- Run both before finishing a task. Fix failures; never skip or delete tests to get green.

## Architecture (dependencies point inward only)
- domain: no imports from application, infrastructure or api.
- application: services, DTOs, ports. IBacklogRepository has loadBacklogItems() and
  saveBacklogItems(items) with snapshot semantics (save = full state).
- infrastructure: repositories and mappers.
- api: Fastify, controllers, Zod schemas, error handler. Format/type validation at the API
  boundary, business rules in the domain.
- Tests mirror src under apps/backend/tests.

## Domain rules
- Entities have private constructors: `create()` for new objects, `reconstitute()` for objects
  loaded from storage. Never bypass them (no casts to private fields).
- A task belongs to >= 1 list (task.listIds, many-to-many). Lists form a tree via parentListId.
  childListIds is derived by Backlog and not persisted.
- Backlog needs items in dependency order (parent lists, child lists, then tasks):
  use orderItemsForBacklog.
- RepetitionPattern.create({ kind: NONE }) must not receive interval/count/endDate/monthlyAnchor.
- DateKey is a branded "YYYY-MM-DD" string, ItemId is a branded string.
- Mutating methods are no-ops (no updatedAt change) when nothing actually changes.

## Conventions
- No `as any` / `as never`.
- The API returns DTOs, never the persistence JSON format.
- DomainError and ZodError -> HTTP 400.
- Code, comments and commit messages in English; conventional commits.

## Working rules
- Implement only what the current task asks for; do not refactor unrelated code.
- Never run destructive commands (dropping databases, deleting data/) unless asked.
- List your assumptions in the final summary.