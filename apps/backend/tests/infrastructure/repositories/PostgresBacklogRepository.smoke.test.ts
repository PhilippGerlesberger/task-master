import { describe, expect, it } from "vitest";
import { ListItem } from "../../../src/domain/backlogItem/ListItem.js";
import { TaskItem } from "../../../src/domain/backlogItem/TaskItem.js";
import { PostgresBacklogRepository } from "../../../src/infrastructure/repositories/PostgresBacklogRepository.js";

const runSmoke = Boolean(process.env.DATABASE_URL);

describe.runIf(runSmoke)("PostgresBacklogRepository smoke", () => {
    it("saves a small backlog and loads it back from Postgres", async () => {
        const { PrismaClient } = await import("@prisma/client");
        const prisma = new PrismaClient();
        const repository = new PostgresBacklogRepository(prisma);

        const root = ListItem.create({ title: "Inbox" });
        const child = ListItem.create({ title: "Project", parentId: root.id });
        const task = TaskItem.create({ title: "Ship release", listIds: [root.id] });

        await prisma.taskList.deleteMany({});
        await prisma.task.deleteMany({});
        await prisma.list.deleteMany({});

        await repository.saveBacklogItems([root, child, task]);
        const loaded = await repository.loadBacklogItems();

        expect(loaded.some((item) => item.id === root.id)).toBe(true);
        expect(loaded.some((item) => item.id === child.id)).toBe(true);
        expect(loaded.some((item) => item.id === task.id)).toBe(true);

        const reloadedTask = loaded.find((item) => item.id === task.id);
        expect(reloadedTask?.kind).toBe("task");
        expect(reloadedTask && "listIds" in reloadedTask ? reloadedTask.listIds : []).toContain(root.id);

        await prisma.$disconnect();
    });
});
