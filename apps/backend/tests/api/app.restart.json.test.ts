import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/api/app.js";
import { INBOX_LIST_ID } from "../../src/domain/shared/constants.js";
import { JsonBacklogRepository } from "../../src/infrastructure/repositories/JsonBacklogRepository.js";

describe("JSON persistence restart flow", () => {
    it("keeps a task in inbox across new app instances", async () => {
        const tempDir = await mkdtemp(join(tmpdir(), "task-master-restart-json-"));
        const filePath = join(tempDir, "backlog.json");

        try {
            const firstRepository = new JsonBacklogRepository(filePath);
            const firstApp = createApp({ backlogRepository: firstRepository });
            const createTaskResponse = await firstApp.inject({
                method: "POST",
                url: "/tasks",
                payload: { title: "Persist me" }
            });
            expect(createTaskResponse.statusCode).toBe(201);
            expect(createTaskResponse.json().listIds).toEqual([INBOX_LIST_ID]);
            await firstApp.close();

            const secondRepository = new JsonBacklogRepository(filePath);
            const secondApp = createApp({ backlogRepository: secondRepository });

            const tasksResponse = await secondApp.inject({ method: "GET", url: "/tasks" });
            expect(tasksResponse.statusCode).toBe(200);
            expect(tasksResponse.json()).toHaveLength(1);
            expect(tasksResponse.json()[0].listIds).toEqual([INBOX_LIST_ID]);

            const listsResponse = await secondApp.inject({ method: "GET", url: "/lists" });
            expect(listsResponse.statusCode).toBe(200);
            const inboxLists = listsResponse.json().filter((list: { id: string }) => list.id === INBOX_LIST_ID);
            expect(inboxLists).toHaveLength(1);

            await secondApp.close();
        } finally {
            await rm(tempDir, { recursive: true, force: true });
        }
    });
});
