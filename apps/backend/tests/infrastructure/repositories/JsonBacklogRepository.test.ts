import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { InfrastructureError } from "../../../src/application/errors.js";
import { JsonBacklogRepository } from "../../../src/infrastructure/repositories/JsonBacklogRepository.js";
import { Backlog } from "../../../src/domain/backlog/Backlog.js";
import { ListItem } from "../../../src/domain/backlogItem/ListItem.js";
import { TaskItem } from "../../../src/domain/backlogItem/TaskItem.js";
import type { ItemId } from "../../../src/domain/shared/types.js";

function createList(title: string, parentId?: ItemId) {
    return ListItem.create({ title, parentId });
}

function createTask(title: string, listId: ItemId) {
    return TaskItem.create({ title, listIds: [listId] });
}

describe("JsonBacklogRepository", () => {
    it("returns an empty backlog when the file does not exist", async () => {
        const tempDir = await mkdtemp(join(tmpdir(), "task-master-json-backlog-"));
        const filePath = join(tempDir, "backlog.json");
        const repository = new JsonBacklogRepository(filePath);

        try {
            await expect(repository.loadBacklogItems()).resolves.toEqual([]);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("round-trips a backlog snapshot through JSON", async () => {
        const tempDir = await mkdtemp(join(tmpdir(), "task-master-json-backlog-"));
        const filePath = join(tempDir, "nested", "backlog.json");
        const repository = new JsonBacklogRepository(filePath);

        const root = createList("Root");
        const child = createList("Child", root.id);
        const task = createTask("Write tests", root.id);
        const backlog = Backlog.fromItems([root, child, task]);

        try {
            await repository.saveBacklogItems(backlog.toPersistenceModel());

            const loadedItems = await repository.loadBacklogItems();
            const loadedBacklog = Backlog.fromItems(loadedItems);

            const loadedRoot = loadedBacklog.getItem(root.id);
            const loadedChild = loadedBacklog.getItem(child.id);
            const loadedTask = loadedBacklog.getItem(task.id);

            expect(loadedRoot).toBeInstanceOf(ListItem);
            expect(loadedChild).toBeInstanceOf(ListItem);
            expect(loadedTask).toBeInstanceOf(TaskItem);
            expect(loadedBacklog.getRootLists()).toHaveLength(1);
            expect(loadedBacklog.getChildren(root.id)).toEqual([loadedChild]);
            expect(loadedBacklog.getTasksInList(root.id)).toEqual([loadedTask]);
            expect((loadedChild as ListItem).parentListId).toBe(root.id);
            expect((loadedTask as TaskItem).listIds).toContain(root.id);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("returns empty backlog for an empty file", async () => {
        const tempDir = await mkdtemp(join(tmpdir(), "task-master-json-backlog-"));
        const filePath = join(tempDir, "backlog.json");
        const repository = new JsonBacklogRepository(filePath);

        try {
            await writeFile(filePath, "   \n", "utf8");
            await expect(repository.loadBacklogItems()).resolves.toEqual([]);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("wraps corrupt JSON as InfrastructureError", async () => {
        const tempDir = await mkdtemp(join(tmpdir(), "task-master-json-backlog-"));
        const filePath = join(tempDir, "backlog.json");
        const repository = new JsonBacklogRepository(filePath);

        try {
            await writeFile(filePath, "{ invalid json", "utf8");
            await expect(repository.loadBacklogItems()).rejects.toBeInstanceOf(InfrastructureError);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("wraps unsupported document version as InfrastructureError", async () => {
        const tempDir = await mkdtemp(join(tmpdir(), "task-master-json-backlog-"));
        const filePath = join(tempDir, "backlog.json");
        const repository = new JsonBacklogRepository(filePath);

        try {
            await writeFile(filePath, JSON.stringify({ version: 2, items: [] }), "utf8");
            await expect(repository.loadBacklogItems()).rejects.toBeInstanceOf(InfrastructureError);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });

    it("wraps corrupt list hierarchy as InfrastructureError", async () => {
        const tempDir = await mkdtemp(join(tmpdir(), "task-master-json-backlog-"));
        const filePath = join(tempDir, "backlog.json");
        const repository = new JsonBacklogRepository(filePath);

        const now = new Date().toISOString();
        const cyclicDocument = {
            version: 1,
            items: [
                {
                    kind: "list",
                    id: "01JABJQH4KTK4TSX2T0FJ2M4Y1",
                    title: "List A",
                    parentListId: "01JABJQH4KTK4TSX2T0FJ2M4Y2",
                    archived: false,
                    createdAt: now,
                    updatedAt: now
                },
                {
                    kind: "list",
                    id: "01JABJQH4KTK4TSX2T0FJ2M4Y2",
                    title: "List B",
                    parentListId: "01JABJQH4KTK4TSX2T0FJ2M4Y1",
                    archived: false,
                    createdAt: now,
                    updatedAt: now
                }
            ]
        };

        try {
            await writeFile(filePath, JSON.stringify(cyclicDocument), "utf8");
            await expect(repository.loadBacklogItems()).rejects.toBeInstanceOf(InfrastructureError);
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});