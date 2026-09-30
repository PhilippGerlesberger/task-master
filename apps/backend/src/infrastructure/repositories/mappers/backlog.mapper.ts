import { ListItem } from "../../../domain/backlogItem/ListItem.js";
import { TaskItem } from "../../../domain/backlogItem/TaskItem.js";
import { RepetitionPattern, Schedule } from "../../../domain/shared/valueObjects.js";
import { DomainError } from "../../../domain/shared/errors.js";
import { ItemStatus, Priority, RepetitionKind } from "../../../domain/shared/types.js";
import type { BacklogItem } from "../../../domain/backlogItem/BacklogItem.types.js";
import type { DateKey, ItemId } from "../../../domain/shared/types.js";

type JsonIsoDate = string;

type JsonRepetitionPattern = {
    kind: RepetitionKind;
    interval?: number;
    monthlyAnchor?: "SAME_DAY" | "END_OF_MONTH";
    count?: number;
    endDate?: JsonIsoDate;
};

type JsonSchedule = {
    startDate?: JsonIsoDate;
    endDate?: JsonIsoDate;
    defaultEndTime?: string;
};

type JsonBaseBacklogItem = {
    kind: "task" | "list";
    id: ItemId;
    title: string;
    createdAt: JsonIsoDate;
    updatedAt: JsonIsoDate;
    archived: boolean;
};

export type JsonListBacklogItem = JsonBaseBacklogItem & {
    kind: "list";
    parentListId?: ItemId;
};

export type JsonTaskBacklogItem = JsonBaseBacklogItem & {
    kind: "task";
    description?: string;
    listIds: ItemId[];
    priority?: Priority;
    estimate?: number;
    repetition: JsonRepetitionPattern;
    schedule?: JsonSchedule;
    status: ItemStatus;
    persistentCompleted: boolean;
};

export type JsonBacklogItem = JsonListBacklogItem | JsonTaskBacklogItem;

export interface JsonBacklogDocument {
    version: 1;
    items: JsonBacklogItem[];
}

export function emptyBacklogDocument(): JsonBacklogDocument {
    return { version: 1, items: [] };
}

export function toPersistence(items: BacklogItem[]): JsonBacklogDocument {
    return {
        version: 1,
        items: items.map((item) => toJsonItem(item))
    };
}

export function toDomain(document: JsonBacklogDocument): BacklogItem[] {
    const hydratedItems = document.items.map((item) => hydrateItem(item));
    return orderItemsForBacklog(hydratedItems);
}

function toJsonItem(item: BacklogItem): JsonBacklogItem {
    const common = {
        id: item.id,
        title: item.title,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        archived: item.archived
    };

    if (item.kind === "list") {
        return {
            kind: "list",
            ...common,
            parentListId: item.parentListId
        };
    }

    return {
        kind: "task",
        ...common,
        description: item.description,
        listIds: [...item.listIds],
        priority: item.priority,
        estimate: item.estimate,
        repetition: serializeRepetition(item.repetition),
        schedule: item.schedule ? serializeSchedule(item.schedule) : undefined,
        status: item.status,
        persistentCompleted: item.persistentCompleted
    };
}

function hydrateItem(item: JsonBacklogItem): BacklogItem {
    if (item.kind === "list") {
        return hydrateListItem(item);
    }

    return hydrateTaskItem(item);
}

function hydrateListItem(item: JsonListBacklogItem): ListItem {
    return ListItem.reconstitute({
        id: item.id,
        title: item.title,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        archived: item.archived,
        parentListId: item.parentListId,
        childListIds: []
    });
}

function hydrateTaskItem(item: JsonTaskBacklogItem): TaskItem {
    return TaskItem.reconstitute({
        id: item.id,
        title: item.title,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        archived: item.archived,
        description: item.description,
        listIds: item.listIds,
        priority: item.priority,
        estimate: item.estimate,
        repetition: deserializeRepetitionPattern(item.repetition),
        schedule: item.schedule ? deserializeSchedule(item.schedule) : undefined,
        status: item.status,
        persistentCompleted: item.persistentCompleted
    });
}

function serializeRepetition(repetition: RepetitionPattern): JsonRepetitionPattern {
    if (repetition.kind === RepetitionKind.NONE) {
        return { kind: RepetitionKind.NONE };
    }

    return {
        kind: repetition.kind,
        interval: repetition.interval,
        monthlyAnchor: repetition.monthlyAnchor,
        count: repetition.count,
        endDate: repetition.endDate
    };
}

function deserializeRepetition(repetition: JsonRepetitionPattern): {
    kind: RepetitionKind;
    interval?: number;
    monthlyAnchor?: "SAME_DAY" | "END_OF_MONTH";
    count?: number;
    endDate?: DateKey;
} {
    if (repetition.kind === RepetitionKind.NONE) {
        return { kind: RepetitionKind.NONE };
    }

    return {
        kind: repetition.kind,
        interval: repetition.interval,
        monthlyAnchor: repetition.monthlyAnchor,
        count: repetition.count,
        endDate: repetition.endDate as DateKey | undefined
    };
}

function deserializeRepetitionPattern(repetition: JsonRepetitionPattern): RepetitionPattern {
    return RepetitionPattern.create(deserializeRepetition(repetition));
}

function serializeSchedule(schedule: Schedule): JsonSchedule {
    return {
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        defaultEndTime: schedule.defaultEndTime
    };
}

function deserializeSchedule(schedule: JsonSchedule): Schedule {
    return Schedule.create({
        startDate: schedule.startDate as DateKey | undefined,
        endDate: schedule.endDate as DateKey | undefined,
        defaultEndTime: schedule.defaultEndTime
    });
}

function orderItemsForBacklog(items: BacklogItem[]): BacklogItem[] {
    const orderedItems: BacklogItem[] = [];
    const visiting = new Set<ItemId>();
    const visited = new Set<ItemId>();
    const byId = new Map<ItemId, BacklogItem>(items.map((item) => [item.id, item]));

    const visit = (item: BacklogItem): void => {
        if (visited.has(item.id)) {
            return;
        }

        if (visiting.has(item.id)) {
            throw new DomainError("Backlog contains a cyclic list hierarchy.");
        }

        visiting.add(item.id);

        if (item.kind === "list" && item.parentListId !== undefined) {
            const parent = byId.get(item.parentListId);
            if (!parent) {
                throw new DomainError("List references a non-existing parent list.");
            }

            visit(parent);
        }

        if (item.kind === "task") {
            for (const listId of item.listIds) {
                const list = byId.get(listId);
                if (!list) {
                    throw new DomainError("Task references a non-existing list.");
                }

                visit(list);
            }
        }

        visiting.delete(item.id);
        visited.add(item.id);
        orderedItems.push(item);
    };

    for (const item of items) {
        visit(item);
    }

    return orderedItems;
}