import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
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
});