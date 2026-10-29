import { describe, it } from "vitest";
import { PostgresBacklogRepository } from "../../../src/infrastructure/repositories/PostgresBacklogRepository.js";
import { runBacklogRepositoryContract } from "../repositories/backlogRepository.contract.js";
import { canRunPostgresTests, createTestPrismaClient, resetDatabase } from "./testDatabase.js";

const runPostgresSuite = canRunPostgresTests();

if (runPostgresSuite) {
    runBacklogRepositoryContract("PostgresBacklogRepository", async () => {
        const prisma = createTestPrismaClient();
        await resetDatabase(prisma);

        return {
            repository: new PostgresBacklogRepository(prisma),
            cleanup: async () => {
                await prisma.$disconnect();
            }
        };
    });
} else {
    describe("PostgresBacklogRepository IBacklogRepository contract", () => {
        it.skip("requires DATABASE_URL_TEST", () => {
            // skipped intentionally when DATABASE_URL_TEST is absent
        });
    });
}
