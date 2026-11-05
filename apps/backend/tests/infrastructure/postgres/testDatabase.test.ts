import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../../src/infrastructure/postgres/generated/client.js";

type TestDatabaseModule = typeof import("./testDatabase.js");

async function loadFreshTestDatabaseModule(): Promise<TestDatabaseModule> {
    vi.resetModules();
    return import("./testDatabase.js");
}

function createResetPrismaDouble(): PrismaClient {
    return {
        $executeRawUnsafe: vi.fn()
    } as unknown as PrismaClient;
}

function setDatabaseUrlTest(value: string | undefined): void {
    if (value === undefined) {
        delete process.env.DATABASE_URL_TEST;
        return;
    }

    process.env.DATABASE_URL_TEST = value;
}

const originalDatabaseUrlTest = process.env.DATABASE_URL_TEST;

afterEach(() => {
    vi.restoreAllMocks();
    setDatabaseUrlTest(originalDatabaseUrlTest);
});

describe("hasSafeTestDatabaseName", () => {
    it("returns true when the database name ends with _test", async () => {
        const { hasSafeTestDatabaseName } = await loadFreshTestDatabaseModule();
        expect(hasSafeTestDatabaseName("postgresql://postgres:postgres@localhost:5432/taskmaster_test?schema=public")).toBe(true);
    });

    it("returns false when the database name does not end with _test", async () => {
        const { hasSafeTestDatabaseName } = await loadFreshTestDatabaseModule();
        expect(hasSafeTestDatabaseName("postgresql://postgres:postgres@localhost:5432/taskmaster?schema=public")).toBe(false);
    });

    it("returns false for malformed URLs", async () => {
        const { hasSafeTestDatabaseName } = await loadFreshTestDatabaseModule();
        expect(hasSafeTestDatabaseName("not-a-url")).toBe(false);
    });
});

describe("canRunPostgresTests", () => {
    it("returns false and logs once when DATABASE_URL_TEST is missing", async () => {
        setDatabaseUrlTest(undefined);
        const { canRunPostgresTests } = await loadFreshTestDatabaseModule();
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        expect(canRunPostgresTests()).toBe(false);
        expect(canRunPostgresTests()).toBe(false);
        expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it("returns false and logs once when database name is unsafe", async () => {
        setDatabaseUrlTest("postgresql://postgres:postgres@localhost:5432/taskmaster?schema=public");
        const { canRunPostgresTests } = await loadFreshTestDatabaseModule();
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        expect(canRunPostgresTests()).toBe(false);
        expect(canRunPostgresTests()).toBe(false);
        expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it("returns true for safe test database names", async () => {
        setDatabaseUrlTest("postgresql://postgres:postgres@localhost:5432/taskmaster_test?schema=public");
        const { canRunPostgresTests } = await loadFreshTestDatabaseModule();

        expect(canRunPostgresTests()).toBe(true);
    });
});

describe("createTestPrismaClient and resetDatabase guards", () => {
    it("throw when DATABASE_URL_TEST is missing", async () => {
        setDatabaseUrlTest(undefined);
        const { createTestPrismaClient, resetDatabase } = await loadFreshTestDatabaseModule();

        await expect(createTestPrismaClient()).rejects.toThrow("DATABASE_URL_TEST is required for Postgres tests.");
        await expect(resetDatabase(createResetPrismaDouble())).rejects.toThrow(
            "DATABASE_URL_TEST is required for Postgres tests."
        );
    });

    it("throw when DATABASE_URL_TEST does not end with _test", async () => {
        setDatabaseUrlTest("postgresql://postgres:postgres@localhost:5432/taskmaster?schema=public");
        const { createTestPrismaClient, resetDatabase } = await loadFreshTestDatabaseModule();

        await expect(createTestPrismaClient()).rejects.toThrow("Refusing to run Postgres tests");
        await expect(resetDatabase(createResetPrismaDouble())).rejects.toThrow("Refusing to run Postgres tests");
    });
});
