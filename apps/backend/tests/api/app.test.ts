import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/api/app.js";
import { ListItem } from "../../src/domain/backlogItem/ListItem.js";
import { TaskItem } from "../../src/domain/backlogItem/TaskItem.js";
import type { ItemId } from "../../src/domain/shared/types.js";
import type { IBacklogRepository } from "../../src/application/ports/IBacklogRepository.js";

function createList(title: string, parentId?: ItemId) {
    return ListItem.create({ title, parentId });
}

function createTask(title: string, listId: ItemId) {
    return TaskItem.create({ title, listIds: [listId] });
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
});
