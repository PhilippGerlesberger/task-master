import { DateKey, ItemId, RepetitionKind } from "../shared/types.js";
import { Priority } from "../shared/types.js";
import type { TaskItem } from "./TaskItem.js";
import type { ListItem } from "./ListItem.js";


export interface CreateTaskItemInput {
    title: string;
    description?: string;
    listIds: ItemId[];
    priority?: Priority;
    estimate?: number;
    repetition?: { kind: RepetitionKind; interval?: number; count?: number; endDate?: DateKey };
    schedule?: { startDate?: DateKey; endDate?: DateKey; defaultEndTime?: string };
}

export interface CreateListItemInput {
    title: string;
    description?: string;
    parentId?: ItemId;
}

export type BacklogItem = TaskItem | ListItem;