import type { PrismaClient } from "@prisma/client";

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

    process.env.DATABASE_URL = databaseUrl;
    const { PrismaClient } = await import("@prisma/client");
    return new PrismaClient();
}

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "task_lists", "tasks", "lists" CASCADE;');
}
