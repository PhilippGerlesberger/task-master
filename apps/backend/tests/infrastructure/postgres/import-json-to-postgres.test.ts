import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { ListItem } from "../../../src/domain/backlogItem/ListItem.js";
import { TaskItem } from "../../../src/domain/backlogItem/TaskItem.js";
import { INBOX_LIST_ID } from "../../../src/domain/shared/constants.js";
import { ensureInboxList } from "../../../src/infrastructure/postgres/ensureInboxList.js";
import { JsonBacklogRepository } from "../../../src/infrastructure/repositories/JsonBacklogRepository.js";
import { importJsonToPostgres } from "../../../tools/import-json-to-postgres.js";
import { canRunPostgresTests, createTestPrismaClient, resetDatabase } from "./testDatabase.js";

const runPostgresSuite = canRunPostgresTests();

describe.skipIf(!runPostgresSuite)("import-json-to-postgres", () => {
    it("allows import when target DB contains only inbox and keeps inbox unique", async () => {
        const databaseUrl = process.env.DATABASE_URL_TEST;
        if (!databaseUrl) {
            return;
        }

        const prisma = await createTestPrismaClient();
        const tempDir = await mkdtemp(join(tmpdir(), "task-master-import-json-"));
        const sourcePath = join(tempDir, "backlog.json");

        try {
            await resetDatabase(prisma);
            await ensureInboxList(prisma);

            const sourceRepository = new JsonBacklogRepository(sourcePath);
            const inbox = ListItem.createInbox();
            const project = ListItem.create({ title: "Project" });
            const task = TaskItem.create({ title: "Imported task", listIds: [inbox.id] });
            await sourceRepository.saveBacklogItems([inbox, project, task]);

            await expect(
                importJsonToPostgres({
                    databaseUrl,
                    jsonFilePath: sourcePath,
                    force: false
                })
            ).resolves.toMatchObject({ importedLists: 2, importedTasks: 1 });

            const inboxRows = await prisma.list.findMany({ where: { id: INBOX_LIST_ID } });
            expect(inboxRows).toHaveLength(1);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
            await prisma.$disconnect();
        }
    });

    it("refuses import when target has non-inbox data without --force", async () => {
        const databaseUrl = process.env.DATABASE_URL_TEST;
        if (!databaseUrl) {
            return;
        }

        const prisma = await createTestPrismaClient();
        const tempDir = await mkdtemp(join(tmpdir(), "task-master-import-json-"));
        const sourcePath = join(tempDir, "backlog.json");

        try {
            await resetDatabase(prisma);
            const existing = ListItem.create({ title: "Existing" });
            await prisma.list.create({
                data: {
                    id: existing.id,
                    title: existing.title,
                    archived: false,
                    createdAt: existing.createdAt,
                    updatedAt: existing.updatedAt
                }
            });

            const sourceRepository = new JsonBacklogRepository(sourcePath);
            await sourceRepository.saveBacklogItems([]);

            await expect(
                importJsonToPostgres({
                    databaseUrl,
                    jsonFilePath: sourcePath,
                    force: false
                })
            ).rejects.toThrow("Refusing import");
        } finally {
            await rm(tempDir, { recursive: true, force: true });
            await prisma.$disconnect();
        }
    });
});
