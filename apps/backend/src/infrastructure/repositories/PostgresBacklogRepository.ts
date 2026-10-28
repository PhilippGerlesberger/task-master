import type { IBacklogRepository } from "../../application/ports/IBacklogRepository.js";
import type { BacklogItem } from "../../domain/backlogItem/BacklogItem.types.js";
import { toDomainItems, toPersistenceRows } from "./mappers/postgres.mapper.js";
import { orderItemsForBacklog } from "./mappers/orderItems.js";

type PrismaClientLike = {
    list: {
        findMany: (args?: any) => Promise<any[]>;
        upsert: (args: any) => Promise<any>;
        deleteMany: (args?: any) => Promise<any>;
        delete: (args: any) => Promise<any>;
        findFirst: (args?: any) => Promise<any | null>;
    };
    task: {
        findMany: (args?: any) => Promise<any[]>;
        upsert: (args: any) => Promise<any>;
        deleteMany: (args?: any) => Promise<any>;
    };
    taskList: {
        findMany: (args?: any) => Promise<any[]>;
        deleteMany: (args?: any) => Promise<any>;
        createMany: (args: any) => Promise<any>;
    };
    $transaction: <T>(callback: (tx: PrismaClientLike) => Promise<T>) => Promise<T>;
};

export class PostgresBacklogRepository implements IBacklogRepository {
    constructor(private readonly prisma: PrismaClientLike) {}

    async loadBacklogItems(): Promise<BacklogItem[]> {
        const [lists, tasks, taskLists] = await Promise.all([
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
        ]);

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
                status: row.status as any,
                priority: row.priority,
                estimate: row.estimate,
                persistent_completed: row.persistentCompleted,
                archived: row.archived,
                repetition_kind: row.repetitionKind as any,
                repetition_interval: row.repetitionInterval,
                repetition_monthly_anchor: row.repetitionMonthlyAnchor as any,
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
    }

    async saveBacklogItems(items: BacklogItem[]): Promise<void> {
        const { listRows, taskRows, taskListRows } = toPersistenceRows(items);
        const listIds = listRows.map((row) => row.id);
        const taskIds = taskRows.map((row) => row.id);

        await this.prisma.$transaction(async (tx) => {
            const orderedListRows = [...listRows].sort(
                (left, right) => Number(left.parent_list_id !== null) - Number(right.parent_list_id !== null)
            );

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
                        status: row.status as any,
                        priority: row.priority,
                        estimate: row.estimate,
                        persistentCompleted: row.persistent_completed,
                        archived: row.archived,
                        repetitionKind: row.repetition_kind as any,
                        repetitionInterval: row.repetition_interval,
                        repetitionMonthlyAnchor: row.repetition_monthly_anchor as any,
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
                        status: row.status as any,
                        priority: row.priority,
                        estimate: row.estimate,
                        persistentCompleted: row.persistent_completed,
                        archived: row.archived,
                        repetitionKind: row.repetition_kind as any,
                        repetitionInterval: row.repetition_interval,
                        repetitionMonthlyAnchor: row.repetition_monthly_anchor as any,
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
                await tx.taskList.createMany({ data: taskListRows.map((row) => ({ taskId: row.task_id, listId: row.list_id })) });
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

            const orderedStaleLists = [...staleLists].sort(
                (left, right) => Number(right.parentListId !== null) - Number(left.parentListId !== null)
            );

            for (const staleList of orderedStaleLists) {
                await tx.list.delete({ where: { id: staleList.id } });
            }
        });

        return undefined;
    }
}

export function materializeBacklog(items: BacklogItem[]): BacklogItem[] {
    return orderItemsForBacklog(items);
}
