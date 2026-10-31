import type { PrismaClient } from "../../../src/infrastructure/postgres/generated/client.js";
import { createPrismaClient } from "../../../src/infrastructure/postgres/createPrismaClient.js";

let skipMessageLogged = false;

export function canRunPostgresTests(): boolean {
    if (process.env.DATABASE_URL_TEST) {
        return true;
    }

    if (!skipMessageLogged) {
        skipMessageLogged = true;
        console.warn("Skipping Postgres test suite: DATABASE_URL_TEST is not set.");
    }

    return false;
}

export async function createTestPrismaClient(): Promise<PrismaClient> {
    const databaseUrl = process.env.DATABASE_URL_TEST;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL_TEST is required for Postgres tests.");
    }

    return createPrismaClient(databaseUrl);
}

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "task_lists", "tasks", "lists" CASCADE;');
}
