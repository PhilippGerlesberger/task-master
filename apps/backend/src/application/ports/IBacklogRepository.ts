import type { BacklogItem } from "../../domain/backlogItem/BacklogItem.types.js";

export interface IBacklogRepository {
	loadBacklogItems(): Promise<BacklogItem[]>;

	saveBacklogItems(items: BacklogItem[]): Promise<void>;

}