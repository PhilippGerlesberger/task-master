import { Backlog } from "../../domain/backlog/Backlog.js";
import type { IBacklogRepository } from "../ports/IBacklogRepository.js";

export class BacklogService {
    constructor(private readonly backlogRepository: IBacklogRepository) {}

    async loadBacklog(): Promise<Backlog> {
        const backlogItems = await this.backlogRepository.loadBacklogItems();
        return Backlog.fromItems(backlogItems);
    }

    async saveBacklog(backlog: Backlog): Promise<void> {
        await this.backlogRepository.saveBacklogItems(backlog.toPersistenceModel());
    }
}