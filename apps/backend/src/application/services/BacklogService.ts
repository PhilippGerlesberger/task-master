import { Backlog } from "../../domain/backlog/Backlog.js";
import { InfrastructureError } from "../errors.js";
import type { IBacklogRepository } from "../ports/IBacklogRepository.js";
import { DomainError } from "../../domain/shared/errors.js";
import type { CreateTaskItemInput } from "../../domain/backlogItem/BacklogItem.types.js";
import type { ItemId } from "../../domain/shared/types.js";
import { INBOX_LIST_ID } from "../../domain/shared/constants.js";
import { TaskItem } from "../../domain/backlogItem/TaskItem.js";

export class BacklogService {
    constructor(private readonly backlogRepository: IBacklogRepository) {}

    async loadBacklog(): Promise<Backlog> {
        const backlogItems = await this.backlogRepository.loadBacklogItems();
        try {
            const backlog = Backlog.fromItems(backlogItems);
            backlog.ensureInboxList();
            return backlog;
        } catch (error) {
            if (error instanceof DomainError) {
                throw new InfrastructureError("Stored backlog is inconsistent.", { cause: error });
            }
            throw error;
        }
    }

    async createTask(input: Omit<CreateTaskItemInput, "listIds"> & { listIds?: ItemId[] }): Promise<TaskItem> {
        const backlog = await this.loadBacklog();
        const listIds = input.listIds && input.listIds.length > 0 ? input.listIds : [INBOX_LIST_ID];
        const task = backlog.addTask({ ...input, listIds });
        await this.saveBacklog(backlog);
        return task;
    }

    async saveBacklog(backlog: Backlog): Promise<void> {
        await this.backlogRepository.saveBacklogItems(backlog.toPersistenceModel());
    }
}