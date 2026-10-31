import type { PrismaClient } from "../../../src/infrastructure/postgres/generated/client.js";
import { createPrismaClient } from "../../../src/infrastructure/postgres/createPrismaClient.js";

let skipMessageLogged = false;

export function canRunPostgresTests(): boolean {
    const testDatabaseUrl = process.env.DATABASE_URL_TEST;
    if (!testDatabaseUrl) {
        if (!skipMessageLogged) {
            skipMessageLogged = true;
            console.warn("Skipping Postgres test suite: DATABASE_URL_TEST is not set.");
        }

        return false;
    }

    if (hasSafeTestDatabaseName(testDatabaseUrl)) {
        return true;
    }

    if (!skipMessageLogged) {
        skipMessageLogged = true;
        console.warn("Skipping Postgres test suite: DATABASE_URL_TEST must point to a database ending with '_test'.");
    }

    return false;
}

export async function createTestPrismaClient(): Promise<PrismaClient> {
    const databaseUrl = process.env.DATABASE_URL_TEST;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL_TEST is required for Postgres tests.");
    }
    assertTestDatabaseUrl(databaseUrl);

    return createPrismaClient(databaseUrl);
}

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL_TEST;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL_TEST is required for Postgres tests.");
    }
    assertTestDatabaseUrl(databaseUrl);

    await prisma.$executeRawUnsafe('TRUNCATE TABLE "task_lists", "tasks", "lists" CASCADE;');
}

export function hasSafeTestDatabaseName(databaseUrl: string): boolean {
    try {
        const parsed = new URL(databaseUrl);
        const databaseName = parsed.pathname
            .split("/")
            .filter((segment) => segment.length > 0)
            .at(-1);

        return databaseName?.endsWith("_test") ?? false;
    } catch {
        return false;
    }
}

function assertTestDatabaseUrl(databaseUrl: string): void {
    if (hasSafeTestDatabaseName(databaseUrl)) {
        return;
    }

    throw new Error("Refusing to run Postgres tests: DATABASE_URL_TEST must point to a database ending with '_test'.");
}
