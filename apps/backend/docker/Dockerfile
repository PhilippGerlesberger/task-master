FROM node:22-alpine AS build

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN pnpm install --frozen-lockfile

COPY apps/backend apps/backend
COPY packages/shared-types packages/shared-types

RUN pnpm --filter @taskmaster/shared-types run build
RUN pnpm --filter @app/backend run db:generate
RUN pnpm --filter @app/backend run build

FROM node:22-alpine AS runner

WORKDIR /workspace

ENV NODE_ENV=production

RUN corepack enable

COPY --from=build /workspace/package.json /workspace/pnpm-lock.yaml /workspace/pnpm-workspace.yaml /workspace/
COPY --from=build /workspace/node_modules /workspace/node_modules
COPY --from=build /workspace/apps/backend /workspace/apps/backend
COPY --from=build /workspace/packages/shared-types /workspace/packages/shared-types

EXPOSE 4000

CMD ["pnpm", "--filter", "@app/backend", "run", "start"]
