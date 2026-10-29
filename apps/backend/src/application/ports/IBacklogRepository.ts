import type { BacklogItem } from "../../domain/backlogItem/BacklogItem.types.js";

export interface IBacklogRepository {
	/**
	 * Loads a complete backlog snapshot.
	 * Implementations throw InfrastructureError for storage failures.
	 */
	loadBacklogItems(): Promise<BacklogItem[]>;

	/**
	 * Persists a complete backlog snapshot.
	 * Implementations throw InfrastructureError for storage failures.
	 */
	saveBacklogItems(items: BacklogItem[]): Promise<void>;

}