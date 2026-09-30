import { describe, expect, it, vi } from "vitest";
import { BacklogService } from "../../../src/application/services/BacklogService.js";
import { Backlog } from "../../../src/domain/backlog/Backlog.js";
import { ListItem } from "../../../src/domain/backlogItem/ListItem.js";
import { TaskItem } from "../../../src/domain/backlogItem/TaskItem.js";
import type { ItemId } from "../../../src/domain/shared/types.js";
import type { IBacklogRepository } from "../../../src/application/ports/IBacklogRepository.js";

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
});