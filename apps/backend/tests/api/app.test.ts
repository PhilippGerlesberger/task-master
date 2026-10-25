import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/api/app.js";
import { ListItem } from "../../src/domain/backlogItem/ListItem.js";
import { TaskItem } from "../../src/domain/backlogItem/TaskItem.js";
import type { ItemId } from "../../src/domain/shared/types.js";
import type { BacklogItem } from "../../src/domain/backlogItem/BacklogItem.types.js";
import type { IBacklogRepository } from "../../src/application/ports/IBacklogRepository.js";

function createList(title: string, parentId?: ItemId) {
    return ListItem.create({ title, parentId });
}

function createTask(title: string, listId: ItemId) {
    return TaskItem.create({ title, listIds: [listId] });
}

function createInMemoryRepository(initialItems: BacklogItem[] = []): IBacklogRepository {
    const storedItems = [...initialItems];

    return {
        loadBacklogItems: vi.fn(async () => storedItems),
        saveBacklogItems: vi.fn(async (items: BacklogItem[]) => {
            storedItems.splice(0, storedItems.length, ...items);
        })
    };
}

describe("createApp", () => {
    it("exposes a health endpoint", async () => {
        const repository: IBacklogRepository = {
            loadBacklogItems: vi.fn().mockResolvedValue([]),
            saveBacklogItems: vi.fn().mockResolvedValue(undefined)
        };

        const app = createApp({ backlogRepository: repository });

        try {
            const response = await app.inject({ method: "GET", url: "/health" });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({ status: "ok" });
        } finally {
            await app.close();
        }
    });

    it("loads tasks through the repository and returns API DTOs", async () => {
        const root = createList("Inbox");
        const child = createList("Today", root.id);
        const task = createTask("Write tests", root.id);
        const items = [root, child, task];
        const repository: IBacklogRepository = {
            loadBacklogItems: vi.fn().mockResolvedValue(items),
            saveBacklogItems: vi.fn().mockResolvedValue(undefined)
        };

        const app = createApp({ backlogRepository: repository });

        try {
            const response = await app.inject({ method: "GET", url: "/tasks" });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual([
                {
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    listIds: [...task.listIds],
                    priority: task.priority,
                    estimate: task.estimate
                }
            ]);
        } finally {
            await app.close();
        }
    });

    it("creates a list and returns an API DTO", async () => {
        const saveBacklogItems = vi.fn().mockResolvedValue(undefined);
        const repository: IBacklogRepository = {
            loadBacklogItems: vi.fn().mockResolvedValue([]),
            saveBacklogItems
        };

        const app = createApp({ backlogRepository: repository });

        try {
            const response = await app.inject({
                method: "POST",
                url: "/lists",
                payload: { title: "Inbox" }
            });

            expect(response.statusCode).toBe(201);
            expect(response.json()).toMatchObject({
                title: "Inbox",
                childListIds: []
            });
            expect(saveBacklogItems).toHaveBeenCalledTimes(1);
        } finally {
            await app.close();
        }
    });

    it("returns 400 with validation issues for invalid task payload", async () => {
        const repository: IBacklogRepository = {
            loadBacklogItems: vi.fn().mockResolvedValue([]),
            saveBacklogItems: vi.fn().mockResolvedValue(undefined)
        };

        const app = createApp({ backlogRepository: repository });

        try {
            const response = await app.inject({
                method: "POST",
                url: "/tasks",
                payload: { title: "", listIds: [] }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json()).toMatchObject({
                message: "Validation failed"
            });
        } finally {
            await app.close();
        }
    });

    it("returns 400 for domain errors", async () => {
        const repository: IBacklogRepository = {
            loadBacklogItems: vi.fn().mockResolvedValue([]),
            saveBacklogItems: vi.fn().mockResolvedValue(undefined)
        };

        const app = createApp({ backlogRepository: repository });

        try {
            const response = await app.inject({
                method: "PATCH",
                url: "/tasks/missing-task/status",
                payload: { status: "DONE" }
            });

            expect(response.statusCode).toBe(400);
            expect(response.json()).toEqual({ message: "Task does not exist." });
        } finally {
            await app.close();
        }
    });

    it("creates, moves and deletes lists through the API", async () => {
        const repository = createInMemoryRepository();
        const app = createApp({ backlogRepository: repository });

        try {
            const createRootResponse = await app.inject({
                method: "POST",
                url: "/lists",
                payload: { title: "Root" }
            });

            expect(createRootResponse.statusCode).toBe(201);
            const rootId = createRootResponse.json().id as ItemId;

            const createChildResponse = await app.inject({
                method: "POST",
                url: "/lists",
                payload: { title: "Child" }
            });

            expect(createChildResponse.statusCode).toBe(201);
            const childId = createChildResponse.json().id as ItemId;

            const listResponse = await app.inject({ method: "GET", url: "/lists" });
            expect(listResponse.statusCode).toBe(200);
            expect(listResponse.json()).toHaveLength(2);

            const moveToRootResponse = await app.inject({
                method: "PATCH",
                url: `/lists/${childId}/move`,
                payload: {}
            });
            expect(moveToRootResponse.statusCode).toBe(204);

            const removeChildResponse = await app.inject({
                method: "DELETE",
                url: `/lists/${childId}`
            });
            expect(removeChildResponse.statusCode).toBe(204);
        } finally {
            await app.close();
        }
    });

    it("creates, updates, assigns, unassigns and deletes tasks through the API", async () => {
        const repository = createInMemoryRepository();
        const app = createApp({ backlogRepository: repository });

        try {
            const listAResponse = await app.inject({
                method: "POST",
                url: "/lists",
                payload: { title: "Inbox" }
            });
            const listBResponse = await app.inject({
                method: "POST",
                url: "/lists",
                payload: { title: "Today" }
            });

            expect(listAResponse.statusCode).toBe(201);
            expect(listBResponse.statusCode).toBe(201);

            const listAId = listAResponse.json().id as ItemId;
            const listBId = listBResponse.json().id as ItemId;

            const createTaskResponse = await app.inject({
                method: "POST",
                url: "/tasks",
                payload: { title: "Write docs", listIds: [listAId] }
            });

            expect(createTaskResponse.statusCode).toBe(201);
            const taskId = createTaskResponse.json().id as ItemId;

            const updateStatusResponse = await app.inject({
                method: "PATCH",
                url: `/tasks/${taskId}/status`,
                payload: { status: "IN_PROGRESS" }
            });
            expect(updateStatusResponse.statusCode).toBe(204);

            const assignResponse = await app.inject({
                method: "POST",
                url: `/tasks/${taskId}/lists/${listBId}`
            });
            expect(assignResponse.statusCode).toBe(204);

            const removeFromListResponse = await app.inject({
                method: "DELETE",
                url: `/tasks/${taskId}/lists/${listAId}`
            });
            expect(removeFromListResponse.statusCode).toBe(204);

            const removeTaskResponse = await app.inject({
                method: "DELETE",
                url: `/tasks/${taskId}`
            });
            expect(removeTaskResponse.statusCode).toBe(204);

            const tasksResponse = await app.inject({ method: "GET", url: "/tasks" });
            expect(tasksResponse.statusCode).toBe(200);
            expect(tasksResponse.json()).toEqual([]);
        } finally {
            await app.close();
        }
    });
});
