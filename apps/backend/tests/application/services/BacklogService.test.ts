import { describe, expect, it, vi } from "vitest";
import { BacklogService } from "../../../src/application/services/BacklogService.js";
import { InfrastructureError } from "../../../src/application/errors.js";
import { Backlog } from "../../../src/domain/backlog/Backlog.js";
import { ListItem } from "../../../src/domain/backlogItem/ListItem.js";
import { TaskItem } from "../../../src/domain/backlogItem/TaskItem.js";
import type { ItemId } from "../../../src/domain/shared/types.js";
import type { IBacklogRepository } from "../../../src/application/ports/IBacklogRepository.js";
import { ItemStatus, RepetitionKind } from "../../../src/domain/shared/types.js";
import { RepetitionPattern } from "../../../src/domain/shared/valueObjects.js";
import { INBOX_LIST_ID } from "../../../src/domain/shared/constants.js";

function createList(title: string) {
    return ListItem.create({ title });
}

function createTask(title: string, listId: ItemId) {
    return TaskItem.create({ title, listIds: [listId] });
}

describe("BacklogService", () => {
    it("loads a backlog from repository items", async () => {
        const list = createList("Inbox");
        const task = createTask("Write tests", list.id);
        const repository: IBacklogRepository = {
            loadBacklogItems: vi.fn().mockResolvedValue([list, task]),
            saveBacklogItems: vi.fn().mockResolvedValue(undefined)
        };

        const service = new BacklogService(repository);

        const backlog = await service.loadBacklog();

        expect(backlog).toBeInstanceOf(Backlog);
        expect(backlog.getItem(list.id)).toBe(list);
        expect(backlog.getItem(task.id)).toBe(task);
    });

    it("saves a backlog through the repository", async () => {
        const list = createList("Inbox");
        const task = createTask("Write tests", list.id);
        const backlog = Backlog.fromItems([list, task]);
        const saveBacklogItems = vi.fn().mockResolvedValue(undefined);
        const repository: IBacklogRepository = {
            loadBacklogItems: vi.fn().mockResolvedValue([]),
            saveBacklogItems
        };

        const service = new BacklogService(repository);

        await service.saveBacklog(backlog);

        expect(saveBacklogItems).toHaveBeenCalledTimes(1);
        expect(saveBacklogItems).toHaveBeenCalledWith(backlog.toPersistenceModel());
    });

    it("wraps inconsistent stored backlog as InfrastructureError", async () => {
        const orphanTask = TaskItem.reconstitute({
            id: "01M7A4FVE0QZP08Z5W2P9X9R3C" as ItemId,
            title: "Broken task",
            createdAt: new Date("2026-08-30T10:00:00.000Z"),
            updatedAt: new Date("2026-08-30T10:00:00.000Z"),
            archived: false,
            listIds: [],
            repetition: RepetitionPattern.create({ kind: RepetitionKind.NONE }),
            status: ItemStatus.TODO,
            persistentCompleted: false
        });
        const repository: IBacklogRepository = {
            loadBacklogItems: vi.fn().mockResolvedValue([orphanTask]),
            saveBacklogItems: vi.fn().mockResolvedValue(undefined)
        };
        const service = new BacklogService(repository);

        await expect(service.loadBacklog()).rejects.toBeInstanceOf(InfrastructureError);
    });

    it("ensures inbox exists when repository is empty", async () => {
        const repository: IBacklogRepository = {
            loadBacklogItems: vi.fn().mockResolvedValue([]),
            saveBacklogItems: vi.fn().mockResolvedValue(undefined)
        };
        const service = new BacklogService(repository);

        const backlog = await service.loadBacklog();
        const lists = backlog.getAllLists();

        expect(lists).toHaveLength(1);
        expect(lists[0].id).toBe(INBOX_LIST_ID);
    });

    it("keeps exactly one inbox when repository already contains inbox", async () => {
        const inbox = ListItem.createInbox();
        const repository: IBacklogRepository = {
            loadBacklogItems: vi.fn().mockResolvedValue([inbox]),
            saveBacklogItems: vi.fn().mockResolvedValue(undefined)
        };
        const service = new BacklogService(repository);

        const backlog = await service.loadBacklog();
        const inboxLists = backlog.getAllLists().filter((list) => list.id === INBOX_LIST_ID);

        expect(inboxLists).toHaveLength(1);
    });
});