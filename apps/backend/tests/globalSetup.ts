import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";

export default function globalSetup(_project: TestProject): void {
    const testDatabaseUrl = process.env.DATABASE_URL_TEST;
    if (!testDatabaseUrl) {
        console.warn("Skipping Postgres migrations in test setup: DATABASE_URL_TEST is not set.");
        return;
    }

    const testsDir = dirname(fileURLToPath(import.meta.url));
    const backendDir = resolve(testsDir, "..");
    const result = spawnSync("pnpm exec prisma migrate deploy", {
        shell: true,
        cwd: backendDir,
        env: {
            ...process.env,
            DATABASE_URL: testDatabaseUrl
        },
        stdio: "inherit"
    });

    if (result.status !== 0) {
        throw new Error("Failed to apply Prisma migrations to DATABASE_URL_TEST.");
    }
}
