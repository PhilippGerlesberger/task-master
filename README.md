# My Vite React TS App

## What this is
A minimal Vite + React + TypeScript starter that renders a heading and a short text.

## Quick start
1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run dev`
3. Build for production:
   - `npm run build`
4. Preview production build:
   - `npm run preview`

## Type checking
Run `npm run typecheck` to run TypeScript type checking.

## CI (GitHub Actions)
- Workflow file: `.github/workflows/ci.yml`
- Current test scope in CI: backend tests (`apps/backend/tests`)
- Build and typecheck run for the workspace, tests currently run only for backend.
- When frontend/SW tests are added, extend CI with additional test steps (e.g. `pnpm --filter @app/frontend exec vitest --run`).

## Notes
- This template uses Vite and React 19 with TypeScript.
- If you prefer `yarn` or `pnpm`, the scripts are compatible.
