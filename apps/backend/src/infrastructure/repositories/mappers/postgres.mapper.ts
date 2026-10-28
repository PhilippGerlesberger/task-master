import { ListItem } from "../../../domain/backlogItem/ListItem.js";
import type { BacklogItem } from "../../../domain/backlogItem/BacklogItem.types.js";
import { TaskItem } from "../../../domain/backlogItem/TaskItem.js";
import { ItemStatus, type DateKey, type ItemId, RepetitionKind } from "../../../domain/shared/types.js";
import { RepetitionPattern, Schedule } from "../../../domain/shared/valueObjects.js";
import { orderItemsForBacklog } from "./orderItems.js";

export type PostgresListRow = {
    id: string;
    title: string;
    parent_list_id: string | null;
    archived: boolean;
    created_at: Date;
    updated_at: Date;
};

export type PostgresTaskRow = {
    id: string;
    title: string;
    description: string | null;
    status: ItemStatus;
    priority: number | null;
    estimate: number | null;
    persistent_completed: boolean;
    archived: boolean;
    repetition_kind: RepetitionKind;
    repetition_interval: number | null;
    repetition_monthly_anchor: "SAME_DAY" | "END_OF_MONTH" | null;
    repetition_count: number | null;
    repetition_end_date: Date | null;
    schedule_start_date: Date | null;
    schedule_end_date: Date | null;
    schedule_default_end_time: string | null;
    created_at: Date;
    updated_at: Date;
};

export type PostgresTaskListRow = {
    task_id: string;
    list_id: string;
};

export function dateKeyToUtcDate(value?: DateKey): Date | null {
    if (!value) {
        return null;
    }

    const [year, month, day] = value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

export function utcDateToDateKey(value: Date | string | null | undefined): DateKey | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }

    const date = typeof value === "string" ? new Date(value) : value;
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    return `${year}-${month}-${day}` as DateKey;
}

export function toDomainItems(
    listRows: PostgresListRow[],
    taskRows: PostgresTaskRow[],
    taskListRows: PostgresTaskListRow[]
): BacklogItem[] {
    const byId = new Map<string, BacklogItem>();

    const listItems = listRows.map((row) => {
        const item = ListItem.reconstitute({
            id: row.id as ItemId,
            title: row.title,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            archived: row.archived,
            parentListId: row.parent_list_id ? (row.parent_list_id as ItemId) : undefined,
            childListIds: []
        });

        byId.set(item.id, item);
        return item;
    });

    const taskByListId = new Map<string, string[]>();
    for (const row of taskListRows) {
        const existing = taskByListId.get(row.list_id) ?? [];
        existing.push(row.task_id);
        taskByListId.set(row.list_id, existing);
    }

    const taskItems = taskRows.map((row) => {
        const task = TaskItem.reconstitute({
            id: row.id as ItemId,
            title: row.title,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            archived: row.archived,
            description: row.description ?? undefined,
            listIds: Array.from(new Set(taskListRows.filter((taskRow) => taskRow.task_id === row.id).map((taskRow) => taskRow.list_id as ItemId))),
            priority: row.priority === null ? undefined : row.priority,
            estimate: row.estimate ?? undefined,
            repetition: deserializeRepetition(row),
            schedule: deserializeSchedule(row),
            status: row.status as ItemStatus,
            persistentCompleted: row.persistent_completed
        });

        byId.set(task.id, task);
        return task;
    });

    for (const item of [...listItems, ...taskItems]) {
        if (item.kind === "list" && item.parentListId !== undefined) {
            const parent = byId.get(item.parentListId);
            if (parent && parent.kind === "list") {
                parent.addChildList(item.id);
            }
        }
    }

    return orderItemsForBacklog([...listItems, ...taskItems]);
}

export function toPersistenceRows(items: BacklogItem[]): {
    listRows: PostgresListRow[];
    taskRows: PostgresTaskRow[];
    taskListRows: PostgresTaskListRow[];
} {
    const listRows: PostgresListRow[] = [];
    const taskRows: PostgresTaskRow[] = [];
    const taskListRows: PostgresTaskListRow[] = [];

    for (const item of items) {
        if (item.kind === "list") {
            listRows.push({
                id: item.id,
                title: item.title,
                parent_list_id: item.parentListId ?? null,
                archived: item.archived,
                created_at: item.createdAt,
                updated_at: item.updatedAt
            });
            continue;
        }

        const persistenceTask = serializeTask(item);
        taskRows.push(persistenceTask);
        for (const listId of item.listIds) {
            taskListRows.push({ task_id: item.id, list_id: listId });
        }
    }

    return { listRows, taskRows, taskListRows };
}

function serializeTask(task: TaskItem): PostgresTaskRow {
    const repetition = task.repetition;
    const repetitionKind = repetition.kind;
    const schedule = task.schedule;

    return {
        id: task.id,
        title: task.title,
        description: task.description ?? null,
        status: task.status,
        priority: task.priority ?? null,
        estimate: task.estimate ?? null,
        persistent_completed: task.persistentCompleted,
        archived: task.archived,
        repetition_kind: repetitionKind,
        repetition_interval: repetition.kind === RepetitionKind.NONE ? null : repetition.interval,
        repetition_monthly_anchor:
            repetition.kind === RepetitionKind.NONE ? null : repetition.monthlyAnchor ?? null,
        repetition_count: repetition.kind === RepetitionKind.NONE ? null : repetition.count ?? null,
        repetition_end_date:
            repetition.kind === RepetitionKind.NONE || repetition.endDate === undefined
                ? null
                : dateKeyToUtcDate(repetition.endDate),
        schedule_start_date: schedule?.startDate ? dateKeyToUtcDate(schedule.startDate) : null,
        schedule_end_date: schedule?.endDate ? dateKeyToUtcDate(schedule.endDate) : null,
        schedule_default_end_time: schedule?.defaultEndTime ?? null,
        created_at: task.createdAt,
        updated_at: task.updatedAt
    };
}

function deserializeRepetition(row: PostgresTaskRow): RepetitionPattern {
    if (row.repetition_kind === RepetitionKind.NONE) {
        return RepetitionPattern.create({ kind: RepetitionKind.NONE });
    }

    return RepetitionPattern.create({
        kind: row.repetition_kind,
        interval: row.repetition_interval ?? undefined,
        monthlyAnchor: row.repetition_monthly_anchor ?? undefined,
        count: row.repetition_count ?? undefined,
        endDate: row.repetition_end_date ? utcDateToDateKey(row.repetition_end_date) : undefined
    });
}

function deserializeSchedule(row: PostgresTaskRow): Schedule | undefined {
    const hasSchedule =
        row.schedule_start_date !== null ||
        row.schedule_end_date !== null ||
        row.schedule_default_end_time !== null;

    if (!hasSchedule) {
        return undefined;
    }

    return Schedule.create({
        startDate: row.schedule_start_date ? utcDateToDateKey(row.schedule_start_date) : undefined,
        endDate: row.schedule_end_date ? utcDateToDateKey(row.schedule_end_date) : undefined,
        defaultEndTime: row.schedule_default_end_time ?? undefined
    });
}

export function taskRowsToDomainRow(row: PostgresTaskRow): TaskItem {
    return TaskItem.reconstitute({
        id: row.id as ItemId,
        title: row.title,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        archived: row.archived,
        description: row.description ?? undefined,
        listIds: [],
        priority: row.priority === null ? undefined : row.priority,
        estimate: row.estimate ?? undefined,
        repetition: deserializeRepetition(row),
        schedule: deserializeSchedule(row),
        status: row.status as ItemStatus,
        persistentCompleted: row.persistent_completed
    });
}
