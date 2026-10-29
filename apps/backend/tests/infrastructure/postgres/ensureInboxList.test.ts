import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { INBOX_LIST_ID } from "../../../src/domain/shared/constants.js";
import { ensureInboxList } from "../../../src/infrastructure/postgres/ensureInboxList.js";
import { canRunPostgresTests, createTestPrismaClient, resetDatabase } from "./testDatabase.js";

const runPostgresSuite = canRunPostgresTests();
const prisma = runPostgresSuite ? createTestPrismaClient() : undefined;

describe.skipIf(!runPostgresSuite)("ensureInboxList", () => {
    beforeEach(async () => {
        if (!prisma) {
            return;
        }
        await resetDatabase(prisma);
    });

    afterAll(async () => {
        if (!prisma) {
            return;
        }
        await prisma.$disconnect();
    });

    it("creates Inbox on an empty database", async () => {
        if (!prisma) {
            return;
        }

        await ensureInboxList(prisma);

        const lists = await prisma.list.findMany();
        expect(lists).toHaveLength(1);
        expect(lists[0].id).toBe(INBOX_LIST_ID);
        expect(lists[0].title).toBe("Inbox");
    });

    it("is idempotent and keeps exactly one Inbox row", async () => {
        if (!prisma) {
            return;
        }

        await ensureInboxList(prisma);
        await ensureInboxList(prisma);

        const inboxRows = await prisma.list.findMany({ where: { id: INBOX_LIST_ID } });
        expect(inboxRows).toHaveLength(1);
    });
});
