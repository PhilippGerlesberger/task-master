import type { IBacklogRepository } from "../../application/ports/IBacklogRepository.js";
import type { BacklogItem } from "../../domain/backlogItem/BacklogItem.types.js";
import { DomainError } from "../../domain/shared/errors.js";
import { InfrastructureError } from "../../application/errors.js";
import { ItemStatus, RepetitionKind as DomainRepetitionKind } from "../../domain/shared/types.js";
import { Prisma, type PrismaClient } from "../postgres/generated/client.js";
import {
    RepetitionKind as PrismaRepetitionKind,
    RepetitionMonthlyAnchor as PrismaRepetitionMonthlyAnchor,
    TaskStatus as PrismaTaskStatus
} from "../postgres/generated/enums.js";
import { toDomainItems, toPersistenceRows } from "./mappers/postgres.mapper.js";
import { sortListRowsByDepth } from "./sortListRowsByDepth.js";

const SNAPSHOT_SAVE_ADVISORY_LOCK_KEY = 932_114_207;

export class PostgresBacklogRepository implements IBacklogRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async loadBacklogItems(): Promise<BacklogItem[]> {
        try {
            const [lists, tasks, taskLists] = await this.prisma.$transaction([
                this.prisma.list.findMany({
                    select: {
                        id: true,
                        title: true,
                        parentListId: true,
                        archived: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }),
                this.prisma.task.findMany({
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        status: true,
                        priority: true,
                        estimate: true,
                        persistentCompleted: true,
                        archived: true,
                        repetitionKind: true,
                        repetitionInterval: true,
                        repetitionMonthlyAnchor: true,
                        repetitionCount: true,
                        repetitionEndDate: true,
                        scheduleStartDate: true,
                        scheduleEndDate: true,
                        scheduleDefaultEndTime: true,
                        createdAt: true,
                        updatedAt: true
                    }
                }),
                this.prisma.taskList.findMany({
                    select: {
                        taskId: true,
                        listId: true
                    }
                })
            ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });

            return toDomainItems(
                lists.map((row) => ({
                    id: row.id,
                    title: row.title,
                    parent_list_id: row.parentListId,
                    archived: row.archived,
                    created_at: row.createdAt,
                    updated_at: row.updatedAt
                })),
                tasks.map((row) => ({
                    id: row.id,
                    title: row.title,
                    description: row.description,
                    status: toDomainTaskStatus(row.status),
                    priority: row.priority,
                    estimate: row.estimate,
                    persistent_completed: row.persistentCompleted,
                    archived: row.archived,
                    repetition_kind: toDomainRepetitionKind(row.repetitionKind),
                    repetition_interval: row.repetitionInterval,
                    repetition_monthly_anchor: toDomainMonthlyAnchor(row.repetitionMonthlyAnchor),
                    repetition_count: row.repetitionCount,
                    repetition_end_date: row.repetitionEndDate,
                    schedule_start_date: row.scheduleStartDate,
                    schedule_end_date: row.scheduleEndDate,
                    schedule_default_end_time: row.scheduleDefaultEndTime,
                    created_at: row.createdAt,
                    updated_at: row.updatedAt
                })),
                taskLists.map((row) => ({
                    task_id: row.taskId,
                    list_id: row.listId
                }))
            );
        } catch (error) {
            throw this.wrapError(error, "Failed to load backlog from PostgreSQL.");
        }
    }

    async saveBacklogItems(items: BacklogItem[]): Promise<void> {
        try {
            const { listRows, taskRows, taskListRows } = toPersistenceRows(items);
            const listIds = listRows.map((row) => row.id);
            const taskIds = taskRows.map((row) => row.id);

            await this.prisma.$transaction(async (tx) => {
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SNAPSHOT_SAVE_ADVISORY_LOCK_KEY})`;

                const orderedListRows = sortListRowsByDepth(listRows, "parents-first");

                for (const row of orderedListRows) {
                    await tx.list.upsert({
                        where: { id: row.id },
                        update: {
                            title: row.title,
                            parentListId: row.parent_list_id,
                            archived: row.archived,
                            updatedAt: row.updated_at
                        },
                        create: {
                            id: row.id,
                            title: row.title,
                            parentListId: row.parent_list_id,
                            archived: row.archived,
                            createdAt: row.created_at,
                            updatedAt: row.updated_at
                        }
                    });
                }

                for (const row of taskRows) {
                    await tx.task.upsert({
                        where: { id: row.id },
                        update: {
                            title: row.title,
                            description: row.description,
                            status: toPrismaTaskStatus(row.status),
                            priority: row.priority,
                            estimate: row.estimate,
                            persistentCompleted: row.persistent_completed,
                            archived: row.archived,
                            repetitionKind: toPrismaRepetitionKind(row.repetition_kind),
                            repetitionInterval: row.repetition_interval,
                            repetitionMonthlyAnchor: toPrismaMonthlyAnchor(row.repetition_monthly_anchor),
                            repetitionCount: row.repetition_count,
                            repetitionEndDate: row.repetition_end_date,
                            scheduleStartDate: row.schedule_start_date,
                            scheduleEndDate: row.schedule_end_date,
                            scheduleDefaultEndTime: row.schedule_default_end_time,
                            updatedAt: row.updated_at
                        },
                        create: {
                            id: row.id,
                            title: row.title,
                            description: row.description,
                            status: toPrismaTaskStatus(row.status),
                            priority: row.priority,
                            estimate: row.estimate,
                            persistentCompleted: row.persistent_completed,
                            archived: row.archived,
                            repetitionKind: toPrismaRepetitionKind(row.repetition_kind),
                            repetitionInterval: row.repetition_interval,
                            repetitionMonthlyAnchor: toPrismaMonthlyAnchor(row.repetition_monthly_anchor),
                            repetitionCount: row.repetition_count,
                            repetitionEndDate: row.repetition_end_date,
                            scheduleStartDate: row.schedule_start_date,
                            scheduleEndDate: row.schedule_end_date,
                            scheduleDefaultEndTime: row.schedule_default_end_time,
                            createdAt: row.created_at,
                            updatedAt: row.updated_at
                        }
                    });
                }

                const taskIdsInSnapshot = Array.from(new Set(taskListRows.map((row) => row.task_id)));
                if (taskIdsInSnapshot.length > 0) {
                    await tx.taskList.deleteMany({
                        where: {
                            taskId: { in: taskIdsInSnapshot }
                        }
                    });
                } else {
                    await tx.taskList.deleteMany({});
                }

                if (taskListRows.length > 0) {
                    await tx.taskList.createMany({
                        data: taskListRows.map((row) => ({ taskId: row.task_id, listId: row.list_id }))
                    });
                }

                if (taskIds.length === 0) {
                    await tx.task.deleteMany({});
                } else {
                    await tx.task.deleteMany({
                        where: {
                            id: { notIn: taskIds }
                        }
                    });
                }

                const staleLists = await (listIds.length === 0
                    ? tx.list.findMany({ select: { id: true, parentListId: true } })
                    : tx.list.findMany({
                        where: { id: { notIn: listIds } },
                        select: { id: true, parentListId: true }
                    }));

                const orderedStaleLists = sortListRowsByDepth(
                    staleLists.map((row) => ({ id: row.id, parent_list_id: row.parentListId })),
                    "children-first"
                );

                for (const staleList of orderedStaleLists) {
                    await tx.list.delete({ where: { id: staleList.id } });
                }
            });
        } catch (error) {
            throw this.wrapError(error, "Failed to save backlog to PostgreSQL.");
        }
    }

    private wrapError(error: unknown, fallbackMessage: string): InfrastructureError {
        if (error instanceof InfrastructureError) {
            return error;
        }

        if (error instanceof DomainError) {
            return new InfrastructureError("Stored backlog data is invalid.", { cause: error });
        }

        return new InfrastructureError(fallbackMessage, { cause: error });
    }
}

function toDomainTaskStatus(value: PrismaTaskStatus): ItemStatus {
    switch (value) {
        case PrismaTaskStatus.TODO:
            return ItemStatus.TODO;
        case PrismaTaskStatus.IN_PROGRESS:
            return ItemStatus.IN_PROGRESS;
        case PrismaTaskStatus.DONE:
            return ItemStatus.DONE;
        default:
            throw new InfrastructureError(`Unsupported task status from storage: ${String(value)}`);
    }
}

function toPrismaTaskStatus(value: ItemStatus): PrismaTaskStatus {
    switch (value) {
        case ItemStatus.TODO:
            return PrismaTaskStatus.TODO;
        case ItemStatus.IN_PROGRESS:
            return PrismaTaskStatus.IN_PROGRESS;
        case ItemStatus.DONE:
            return PrismaTaskStatus.DONE;
        default:
            throw new InfrastructureError(`Unsupported task status for storage: ${String(value)}`);
    }
}

function toDomainRepetitionKind(value: PrismaRepetitionKind): DomainRepetitionKind {
    switch (value) {
        case PrismaRepetitionKind.NONE:
            return DomainRepetitionKind.NONE;
        case PrismaRepetitionKind.DAILY:
            return DomainRepetitionKind.DAILY;
        case PrismaRepetitionKind.WEEKLY:
            return DomainRepetitionKind.WEEKLY;
        case PrismaRepetitionKind.MONTHLY:
            return DomainRepetitionKind.MONTHLY;
        case PrismaRepetitionKind.YEARLY:
            return DomainRepetitionKind.YEARLY;
        default:
            throw new InfrastructureError(`Unsupported repetition kind from storage: ${String(value)}`);
    }
}

function toPrismaRepetitionKind(value: DomainRepetitionKind): PrismaRepetitionKind {
    switch (value) {
        case DomainRepetitionKind.NONE:
            return PrismaRepetitionKind.NONE;
        case DomainRepetitionKind.DAILY:
            return PrismaRepetitionKind.DAILY;
        case DomainRepetitionKind.WEEKLY:
            return PrismaRepetitionKind.WEEKLY;
        case DomainRepetitionKind.MONTHLY:
            return PrismaRepetitionKind.MONTHLY;
        case DomainRepetitionKind.YEARLY:
            return PrismaRepetitionKind.YEARLY;
        default:
            throw new InfrastructureError(`Unsupported repetition kind for storage: ${String(value)}`);
    }
}

function toDomainMonthlyAnchor(
    value: PrismaRepetitionMonthlyAnchor | null
): "SAME_DAY" | "END_OF_MONTH" | null {
    if (value === null) {
        return null;
    }

    switch (value) {
        case PrismaRepetitionMonthlyAnchor.SAME_DAY:
            return "SAME_DAY";
        case PrismaRepetitionMonthlyAnchor.END_OF_MONTH:
            return "END_OF_MONTH";
        default:
            throw new InfrastructureError(`Unsupported monthly anchor from storage: ${String(value)}`);
    }
}

function toPrismaMonthlyAnchor(
    value: "SAME_DAY" | "END_OF_MONTH" | null
): PrismaRepetitionMonthlyAnchor | null {
    if (value === null) {
        return null;
    }

    switch (value) {
        case "SAME_DAY":
            return PrismaRepetitionMonthlyAnchor.SAME_DAY;
        case "END_OF_MONTH":
            return PrismaRepetitionMonthlyAnchor.END_OF_MONTH;
        default:
            throw new InfrastructureError(`Unsupported monthly anchor for storage: ${String(value)}`);
    }
}
