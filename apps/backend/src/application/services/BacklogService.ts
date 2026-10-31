import { Backlog } from "../../domain/backlog/Backlog.js";
import { InfrastructureError } from "../errors.js";
import type { IBacklogRepository } from "../ports/IBacklogRepository.js";
import { DomainError } from "../../domain/shared/errors.js";

export class BacklogService {
    constructor(private readonly backlogRepository: IBacklogRepository) {}

    async loadBacklog(): Promise<Backlog> {
        const backlogItems = await this.backlogRepository.loadBacklogItems();
        try {
            return Backlog.fromItems(backlogItems);
        } catch (error) {
            if (error instanceof DomainError) {
                throw new InfrastructureError("Stored backlog is inconsistent.", { cause: error });
            }
            throw error;
        }
    }

    async saveBacklog(backlog: Backlog): Promise<void> {
        await this.backlogRepository.saveBacklogItems(backlog.toPersistenceModel());
    }
}