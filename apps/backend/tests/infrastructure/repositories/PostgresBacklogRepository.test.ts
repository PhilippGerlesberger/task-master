import { describe, expect, it, vi } from "vitest";
import { DomainError } from "../../../src/domain/shared/errors.js";
import { ListItem } from "../../../src/domain/backlogItem/ListItem.js";
import { TaskItem } from "../../../src/domain/backlogItem/TaskItem.js";
import { InfrastructureError } from "../../../src/application/errors.js";
import { PostgresBacklogRepository } from "../../../src/infrastructure/repositories/PostgresBacklogRepository.js";
import type { PrismaClient } from "../../../src/infrastructure/postgres/generated/client.js";
import {
    RepetitionKind as PrismaRepetitionKind,
    TaskStatus as PrismaTaskStatus
} from "../../../src/infrastructure/postgres/generated/enums.js";

function createRepository(prisma: object): PostgresBacklogRepository {
    return new PostgresBacklogRepository(prisma as unknown as PrismaClient);
}

describe("PostgresBacklogRepository", () => {
    it("loads backlog items from persisted rows", async () => {
        const createdAt = new Date("2026-01-01T12:00:00.000Z");
        const updatedAt = new Date("2026-01-02T12:00:00.000Z");
        const listId = "01M7A4FVE0QZP08Z5W2P9X9R3A";
        const taskId = "01M7A4FVE0QZP08Z5W2P9X9R3B";

        const prisma = {
            list: {
                findMany: vi.fn().mockResolvedValue([
                    { id: listId, title: "Inbox", parentListId: null, archived: false, createdAt, updatedAt }
                ])
            },
            task: {
                findMany: vi.fn().mockResolvedValue([
                    {
                        id: taskId,
                        title: "Write tests",
                        description: null,
                        status: PrismaTaskStatus.TODO,
                        priority: null,
                        estimate: null,
                        persistentCompleted: false,
                        archived: false,
                        repetitionKind: PrismaRepetitionKind.NONE,
                        repetitionInterval: 0,
                        repetitionMonthlyAnchor: null,
                        repetitionCount: null,
                        repetitionEndDate: null,
                        scheduleStartDate: null,
                        scheduleEndDate: null,
                        scheduleDefaultEndTime: null,
                        createdAt,
                        updatedAt
                    }
                ])
            },
            taskList: {
                findMany: vi.fn().mockResolvedValue([{ taskId, listId }])
            },
            $transaction: vi.fn(async (operations: unknown) => Promise.all(operations as Promise<unknown>[]))
        };

        const repository = createRepository(prisma);
        const loadedItems = await repository.loadBacklogItems();

        expect(loadedItems).toHaveLength(2);
        expect(loadedItems.find((item) => item.id === listId)?.kind).toBe("list");
        expect(loadedItems.find((item) => item.id === taskId)?.kind).toBe("task");
    });

    it("wraps DomainError during load as InfrastructureError", async () => {
        const listId = "01M7A4FVE0QZP08Z5W2P9X9R3A";
        const taskId = "01M7A4FVE0QZP08Z5W2P9X9R3B";
        const createdAt = new Date("2026-01-01T12:00:00.000Z");
        const updatedAt = new Date("2026-01-02T12:00:00.000Z");

        const prisma = {
            list: {
                findMany: vi.fn().mockResolvedValue([
                    { id: listId, title: "Inbox", parentListId: null, archived: false, createdAt, updatedAt }
                ])
            },
            task: {
                findMany: vi.fn().mockResolvedValue([
                    {
                        id: taskId,
                        title: "Write tests",
                        description: null,
                        status: PrismaTaskStatus.TODO,
                        priority: null,
                        estimate: null,
                        persistentCompleted: false,
                        archived: false,
                        repetitionKind: PrismaRepetitionKind.NONE,
                        repetitionInterval: 0,
                        repetitionMonthlyAnchor: null,
                        repetitionCount: null,
                        repetitionEndDate: null,
                        scheduleStartDate: null,
                        scheduleEndDate: null,
                        scheduleDefaultEndTime: null,
                        createdAt,
                        updatedAt
                    }
                ])
            },
            taskList: {
                findMany: vi.fn().mockResolvedValue([{ taskId, listId: "01M7A4FVE0QZP08Z5W2P9X9R3C" }])
            },
            $transaction: vi.fn(async (operations: unknown) => Promise.all(operations as Promise<unknown>[]))
        };

        const repository = createRepository(prisma);
        await expect(repository.loadBacklogItems()).rejects.toMatchObject({
            message: "Stored backlog data is invalid."
        });
    });

    it("keeps InfrastructureError from unsupported storage values during load", async () => {
        const listId = "01M7A4FVE0QZP08Z5W2P9X9R3A";
        const taskId = "01M7A4FVE0QZP08Z5W2P9X9R3B";
        const createdAt = new Date("2026-01-01T12:00:00.000Z");
        const updatedAt = new Date("2026-01-02T12:00:00.000Z");

        const prisma = {
            list: {
                findMany: vi.fn().mockResolvedValue([
                    { id: listId, title: "Inbox", parentListId: null, archived: false, createdAt, updatedAt }
                ])
            },
            task: {
                findMany: vi.fn().mockResolvedValue([
                    {
                        id: taskId,
                        title: "Write tests",
                        description: null,
                        status: "BROKEN_STATUS",
                        priority: null,
                        estimate: null,
                        persistentCompleted: false,
                        archived: false,
                        repetitionKind: PrismaRepetitionKind.NONE,
                        repetitionInterval: 0,
                        repetitionMonthlyAnchor: null,
                        repetitionCount: null,
                        repetitionEndDate: null,
                        scheduleStartDate: null,
                        scheduleEndDate: null,
                        scheduleDefaultEndTime: null,
                        createdAt,
                        updatedAt
                    }
                ])
            },
            taskList: {
                findMany: vi.fn().mockResolvedValue([{ taskId, listId }])
            },
            $transaction: vi.fn(async (operations: unknown) => Promise.all(operations as Promise<unknown>[]))
        };

        const repository = createRepository(prisma);
        await expect(repository.loadBacklogItems()).rejects.toMatchObject({
            message: "Unsupported task status from storage: BROKEN_STATUS"
        });
    });

    it("keeps InfrastructureError for unsupported repetition kind from storage", async () => {
        const listId = "01M7A4FVE0QZP08Z5W2P9X9R3A";
        const taskId = "01M7A4FVE0QZP08Z5W2P9X9R3B";
        const createdAt = new Date("2026-01-01T12:00:00.000Z");
        const updatedAt = new Date("2026-01-02T12:00:00.000Z");

        const prisma = {
            list: {
                findMany: vi.fn().mockResolvedValue([
                    { id: listId, title: "Inbox", parentListId: null, archived: false, createdAt, updatedAt }
                ])
            },
            task: {
                findMany: vi.fn().mockResolvedValue([
                    {
                        id: taskId,
                        title: "Write tests",
                        description: null,
                        status: PrismaTaskStatus.TODO,
                        priority: null,
                        estimate: null,
                        persistentCompleted: false,
                        archived: false,
                        repetitionKind: "BROKEN_REPETITION",
                        repetitionInterval: 0,
                        repetitionMonthlyAnchor: null,
                        repetitionCount: null,
                        repetitionEndDate: null,
                        scheduleStartDate: null,
                        scheduleEndDate: null,
                        scheduleDefaultEndTime: null,
                        createdAt,
                        updatedAt
                    }
                ])
            },
            taskList: {
                findMany: vi.fn().mockResolvedValue([{ taskId, listId }])
            },
            $transaction: vi.fn(async (operations: unknown) => Promise.all(operations as Promise<unknown>[]))
        };

        const repository = createRepository(prisma);
        await expect(repository.loadBacklogItems()).rejects.toMatchObject({
            message: "Unsupported repetition kind from storage: BROKEN_REPETITION"
        });
    });

    it("keeps InfrastructureError for unsupported monthly anchor from storage", async () => {
        const listId = "01M7A4FVE0QZP08Z5W2P9X9R3A";
        const taskId = "01M7A4FVE0QZP08Z5W2P9X9R3B";
        const createdAt = new Date("2026-01-01T12:00:00.000Z");
        const updatedAt = new Date("2026-01-02T12:00:00.000Z");

        const prisma = {
            list: {
                findMany: vi.fn().mockResolvedValue([
                    { id: listId, title: "Inbox", parentListId: null, archived: false, createdAt, updatedAt }
                ])
            },
            task: {
                findMany: vi.fn().mockResolvedValue([
                    {
                        id: taskId,
                        title: "Write tests",
                        description: null,
                        status: PrismaTaskStatus.TODO,
                        priority: null,
                        estimate: null,
                        persistentCompleted: false,
                        archived: false,
                        repetitionKind: PrismaRepetitionKind.MONTHLY,
                        repetitionInterval: 1,
                        repetitionMonthlyAnchor: "BROKEN_ANCHOR",
                        repetitionCount: null,
                        repetitionEndDate: null,
                        scheduleStartDate: null,
                        scheduleEndDate: null,
                        scheduleDefaultEndTime: null,
                        createdAt,
                        updatedAt
                    }
                ])
            },
            taskList: {
                findMany: vi.fn().mockResolvedValue([{ taskId, listId }])
            },
            $transaction: vi.fn(async (operations: unknown) => Promise.all(operations as Promise<unknown>[]))
        };

        const repository = createRepository(prisma);
        await expect(repository.loadBacklogItems()).rejects.toMatchObject({
            message: "Unsupported monthly anchor from storage: BROKEN_ANCHOR"
        });
    });

    it("wraps unexpected load failures with fallback message", async () => {
        const prisma = {
            list: { findMany: vi.fn().mockResolvedValue([]) },
            task: { findMany: vi.fn().mockResolvedValue([]) },
            taskList: { findMany: vi.fn().mockResolvedValue([]) },
            $transaction: vi.fn().mockRejectedValue(new Error("connection dropped"))
        };
        const repository = createRepository(prisma);

        await expect(repository.loadBacklogItems()).rejects.toMatchObject({
            message: "Failed to load backlog from PostgreSQL."
        });
    });

    it("saves non-empty snapshots and removes stale rows by snapshot diff", async () => {
        const upsertList = vi.fn().mockResolvedValue(undefined);
        const upsertTask = vi.fn().mockResolvedValue(undefined);
        const deleteTaskLists = vi.fn().mockResolvedValue(undefined);
        const createTaskLists = vi.fn().mockResolvedValue(undefined);
        const deleteTasks = vi.fn().mockResolvedValue(undefined);
        const findStaleLists = vi
            .fn()
            .mockResolvedValue([{ id: "01M7A4FVE0QZP08Z5W2P9X9R3D", parentListId: null }]);
        const deleteList = vi.fn().mockResolvedValue(undefined);
        const executeRaw = vi.fn().mockResolvedValue(undefined);

        const tx = {
            $executeRaw: executeRaw,
            list: {
                upsert: upsertList,
                findMany: findStaleLists,
                delete: deleteList
            },
            task: {
                upsert: upsertTask,
                deleteMany: deleteTasks
            },
            taskList: {
                deleteMany: deleteTaskLists,
                createMany: createTaskLists
            }
        };

        const prisma = {
            $transaction: vi.fn(async (arg: unknown) => {
                if (typeof arg === "function") {
                    return arg(tx);
                }
                return [];
            })
        };

        const repository = createRepository(prisma);
        const list = ListItem.create({ title: "Inbox" });
        const task = TaskItem.create({ title: "Write tests", listIds: [list.id] });

        await repository.saveBacklogItems([list, task]);

        expect(upsertList).toHaveBeenCalledTimes(1);
        expect(upsertTask).toHaveBeenCalledTimes(1);
        expect(deleteTaskLists).toHaveBeenCalledWith({
            where: { taskId: { in: [task.id] } }
        });
        expect(createTaskLists).toHaveBeenCalledTimes(1);
        expect(deleteTasks).toHaveBeenCalledWith({
            where: { id: { notIn: [task.id] } }
        });
        expect(findStaleLists).toHaveBeenCalledWith({
            where: { id: { notIn: [list.id] } },
            select: { id: true, parentListId: true }
        });
        expect(deleteList).toHaveBeenCalledWith({ where: { id: "01M7A4FVE0QZP08Z5W2P9X9R3D" } });
    });

    it("saves empty snapshots and clears all tasks, links and stale lists children-first", async () => {
        const deleteTaskLists = vi.fn().mockResolvedValue(undefined);
        const createTaskLists = vi.fn().mockResolvedValue(undefined);
        const deleteTasks = vi.fn().mockResolvedValue(undefined);
        const deleteList = vi.fn().mockResolvedValue(undefined);

        const tx = {
            $executeRaw: vi.fn().mockResolvedValue(undefined),
            list: {
                upsert: vi.fn(),
                findMany: vi.fn().mockResolvedValue([
                    { id: "01M7A4FVE0QZP08Z5W2P9X9R3E", parentListId: "01M7A4FVE0QZP08Z5W2P9X9R3F" },
                    { id: "01M7A4FVE0QZP08Z5W2P9X9R3F", parentListId: null }
                ]),
                delete: deleteList
            },
            task: {
                upsert: vi.fn(),
                deleteMany: deleteTasks
            },
            taskList: {
                deleteMany: deleteTaskLists,
                createMany: createTaskLists
            }
        };

        const prisma = {
            $transaction: vi.fn(async (arg: unknown) => {
                if (typeof arg === "function") {
                    return arg(tx);
                }
                return [];
            })
        };

        const repository = createRepository(prisma);
        await repository.saveBacklogItems([]);

        expect(deleteTaskLists).toHaveBeenCalledWith({});
        expect(createTaskLists).not.toHaveBeenCalled();
        expect(deleteTasks).toHaveBeenCalledWith({});
        expect(tx.list.findMany).toHaveBeenCalledWith({ select: { id: true, parentListId: true } });
        expect(deleteList.mock.calls.map((call) => call[0])).toEqual([
            { where: { id: "01M7A4FVE0QZP08Z5W2P9X9R3E" } },
            { where: { id: "01M7A4FVE0QZP08Z5W2P9X9R3F" } }
        ]);
    });

    it("wraps DomainError during save as InfrastructureError", async () => {
        const list = ListItem.create({ title: "Inbox" });
        const task = TaskItem.create({ title: "Write tests", listIds: [list.id] });

        const prisma = {
            $transaction: vi.fn().mockRejectedValue(new DomainError("invalid hierarchy"))
        };

        const repository = createRepository(prisma);
        await expect(repository.saveBacklogItems([list, task])).rejects.toMatchObject({
            message: "Stored backlog data is invalid."
        });
    });

    it("rethrows InfrastructureError during save without overriding message", async () => {
        const list = ListItem.create({ title: "Inbox" });
        const infrastructureError = new InfrastructureError("transaction deadlock");
        const prisma = {
            $transaction: vi.fn().mockRejectedValue(infrastructureError)
        };

        const repository = createRepository(prisma);
        await expect(repository.saveBacklogItems([list])).rejects.toBe(infrastructureError);
    });

    it("wraps unexpected save failures with fallback message", async () => {
        const list = ListItem.create({ title: "Inbox" });
        const prisma = {
            $transaction: vi.fn().mockRejectedValue(new Error("write failed"))
        };
        const repository = createRepository(prisma);

        await expect(repository.saveBacklogItems([list])).rejects.toMatchObject({
            message: "Failed to save backlog to PostgreSQL."
        });
    });
});
