import { describe, expect, it } from "vitest";
import type { IBacklogRepository } from "../../../src/application/ports/IBacklogRepository.js";
import { Backlog } from "../../../src/domain/backlog/Backlog.js";
import { ListItem } from "../../../src/domain/backlogItem/ListItem.js";
import { TaskItem } from "../../../src/domain/backlogItem/TaskItem.js";
import { ItemStatus, Priority, RepetitionKind, type DateKey, type ItemId } from "../../../src/domain/shared/types.js";
import { RepetitionPattern } from "../../../src/domain/shared/valueObjects.js";

type RepositoryHarness = {
    repository: IBacklogRepository;
    cleanup: () => Promise<void>;
};

export function runBacklogRepositoryContract(
    name: string,
    createRepository: () => Promise<RepositoryHarness>
): void {
    describe(`${name} IBacklogRepository contract`, () => {
        it("loads an empty repository as []", async () => {
            const { repository, cleanup } = await createRepository();
            try {
                await expect(repository.loadBacklogItems()).resolves.toEqual([]);
            } finally {
                await cleanup();
            }
        });

        it("round-trips complex snapshots and preserves all fields", async () => {
            const { repository, cleanup } = await createRepository();
            try {
                const root = ListItem.create({ title: "Root" });
                const child = ListItem.create({ title: "Child", parentId: root.id });
                const focus = ListItem.create({ title: "Focus", parentId: root.id });
                const multiListTask = TaskItem.create({
                    title: "Plan sprint",
                    description: "Plan current sprint goals",
                    listIds: [root.id, child.id],
                    priority: Priority.HIGH,
                    estimate: 3.5,
                    repetition: {
                        kind: RepetitionKind.WEEKLY,
                        interval: 2,
                        count: 4,
                        endDate: "2026-12-31" as DateKey
                    },
                    schedule: {
                        startDate: "2026-03-29" as DateKey,
                        endDate: "2026-12-31" as DateKey,
                        defaultEndTime: "18:00"
                    }
                });
                const noneTask = TaskItem.create({
                    title: "One-off note",
                    description: "No repetition",
                    listIds: [focus.id],
                    repetition: { kind: RepetitionKind.NONE },
                    priority: Priority.LOW,
                    estimate: 0.5
                });

                multiListTask.markInProgress();
                child.archive();
                noneTask.archive();
                const expectedSnapshot = Backlog.fromItems([root, child, focus, multiListTask, noneTask]).toPersistenceModel();

                await repository.saveBacklogItems(expectedSnapshot);
                const reloaded = await repository.loadBacklogItems();

                expect(normalizeItems(reloaded)).toEqual(normalizeItems(expectedSnapshot));
            } finally {
                await cleanup();
            }
        });

        it("persists changed backlog snapshots", async () => {
            const { repository, cleanup } = await createRepository();
            try {
                const root = ListItem.create({ title: "Root" });
                const child = ListItem.create({ title: "Child", parentId: root.id });
                const inbox = ListItem.create({ title: "Inbox" });
                const task = TaskItem.create({
                    title: "Ship release",
                    listIds: [root.id, child.id],
                    repetition: { kind: RepetitionKind.NONE }
                });

                await repository.saveBacklogItems([root, child, inbox, task]);

                const loadedBacklog = Backlog.fromItems(await repository.loadBacklogItems());
                const loadedRoot = getList(loadedBacklog, root.id);
                const loadedTask = getTask(loadedBacklog, task.id);

                loadedRoot.rename("Root renamed");
                loadedBacklog.moveList(child.id, inbox.id);
                loadedBacklog.updateTaskStatus(task.id, ItemStatus.DONE);
                loadedBacklog.assignTaskToList(task.id, inbox.id);
                loadedBacklog.removeTaskFromList(task.id, root.id);

                await repository.saveBacklogItems(loadedBacklog.toPersistenceModel());
                const updatedBacklog = Backlog.fromItems(await repository.loadBacklogItems());

                expect(getList(updatedBacklog, root.id).title).toBe("Root renamed");
                expect(getList(updatedBacklog, child.id).parentListId).toBe(inbox.id);
                expect(getTask(updatedBacklog, task.id).status).toBe(ItemStatus.DONE);
                expect(getTask(updatedBacklog, task.id).listIds).toContain(inbox.id);
                expect(getTask(updatedBacklog, task.id).listIds).not.toContain(root.id);
            } finally {
                await cleanup();
            }
        });

        it("deletes removed snapshot items", async () => {
            const { repository, cleanup } = await createRepository();
            try {
                const root = ListItem.create({ title: "Root" });
                const task = TaskItem.create({
                    title: "Temporary task",
                    listIds: [root.id],
                    repetition: { kind: RepetitionKind.NONE }
                });

                await repository.saveBacklogItems([root, task]);
                await repository.saveBacklogItems([root]);

                const loaded = await repository.loadBacklogItems();
                expect(loaded.some((item) => item.id === task.id)).toBe(false);
            } finally {
                await cleanup();
            }
        });

        it("removes a whole subtree in a single snapshot while keeping siblings", async () => {
            const { repository, cleanup } = await createRepository();
            try {
                const root = ListItem.create({ title: "Root" });
                const subtreeRoot = ListItem.create({ title: "A", parentId: root.id });
                const subtreeChild = ListItem.create({ title: "B", parentId: subtreeRoot.id });
                const subtreeLeaf = ListItem.create({ title: "C", parentId: subtreeChild.id });
                const sibling = ListItem.create({ title: "Sibling", parentId: root.id });

                await repository.saveBacklogItems([root, subtreeRoot, subtreeChild, subtreeLeaf, sibling]);
                await repository.saveBacklogItems([root, sibling]);

                const loadedBacklog = Backlog.fromItems(await repository.loadBacklogItems());

                expect(loadedBacklog.getItem(subtreeRoot.id)).toBeUndefined();
                expect(loadedBacklog.getItem(subtreeChild.id)).toBeUndefined();
                expect(loadedBacklog.getItem(subtreeLeaf.id)).toBeUndefined();
                expect(loadedBacklog.getChildren(root.id).map((item) => item.id)).toEqual([sibling.id]);
            } finally {
                await cleanup();
            }
        });

        it("moves a list into a deeper branch and reloads hierarchy correctly", async () => {
            const { repository, cleanup } = await createRepository();
            try {
                const root = ListItem.create({ title: "Root" });
                const listA = ListItem.create({ title: "A", parentId: root.id });
                const listB = ListItem.create({ title: "B", parentId: root.id });
                const listC = ListItem.create({ title: "C", parentId: listB.id });
                await repository.saveBacklogItems([root, listA, listB, listC]);

                const toMoveBacklog = Backlog.fromItems(await repository.loadBacklogItems());
                toMoveBacklog.moveList(listA.id, listC.id);
                await repository.saveBacklogItems(toMoveBacklog.toPersistenceModel());

                const reloadedBacklog = Backlog.fromItems(await repository.loadBacklogItems());
                expect(getList(reloadedBacklog, listA.id).parentListId).toBe(listC.id);
                expect(getChildrenIds(reloadedBacklog, root.id)).toEqual([listB.id]);
                expect(getChildrenIds(reloadedBacklog, listB.id)).toEqual([listC.id]);
                expect(getChildrenIds(reloadedBacklog, listC.id)).toEqual([listA.id]);
            } finally {
                await cleanup();
            }
        });

        it("is idempotent when saving the same snapshot twice", async () => {
            const { repository, cleanup } = await createRepository();
            try {
                const root = ListItem.create({ title: "Root" });
                const child = ListItem.create({ title: "Child", parentId: root.id });
                const task = TaskItem.create({
                    title: "Stable task",
                    listIds: [root.id, child.id],
                    repetition: {
                        kind: RepetitionKind.DAILY,
                        interval: 1
                    },
                    schedule: {
                        startDate: "2026-01-01" as DateKey
                    }
                });

                const snapshot = [root, child, task];
                await repository.saveBacklogItems(snapshot);
                await repository.saveBacklogItems(snapshot);

                const loaded = await repository.loadBacklogItems();
                expect(normalizeItems(loaded)).toEqual(normalizeItems(snapshot));
            } finally {
                await cleanup();
            }
        });

        it("round-trips through Backlog materialization without mutating snapshot timestamps", async () => {
            const { repository, cleanup } = await createRepository();
            try {
                const timestamp = new Date("2026-08-30T10:00:00.000Z");
                const root = ListItem.reconstitute({
                    id: "01M7A4FVE0QZP08Z5W2P9X9R6F" as ItemId,
                    title: "Root",
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    archived: false,
                    childListIds: []
                });
                const child = ListItem.reconstitute({
                    id: "01M7A4FVE0QZP08Z5W2P9X9R7G" as ItemId,
                    title: "Child",
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    archived: false,
                    parentListId: root.id,
                    childListIds: []
                });
                const grandChild = ListItem.reconstitute({
                    id: "01M7A4FVE0QZP08Z5W2P9X9R8H" as ItemId,
                    title: "Grand Child",
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    archived: false,
                    parentListId: child.id,
                    childListIds: []
                });
                const task = TaskItem.reconstitute({
                    id: "01M7A4FVE0QZP08Z5W2P9X9R9J" as ItemId,
                    title: "Cross list task",
                    createdAt: timestamp,
                    updatedAt: timestamp,
                    archived: false,
                    listIds: [child.id, grandChild.id],
                    repetition: RepetitionPattern.create({ kind: RepetitionKind.NONE }),
                    status: ItemStatus.TODO,
                    persistentCompleted: false
                });

                const savedSnapshot = Backlog.fromItems([root, child, grandChild, task]).toPersistenceModel();
                await repository.saveBacklogItems(savedSnapshot);

                const loadedSnapshot = await repository.loadBacklogItems();
                const materialized = Backlog.fromItems(loadedSnapshot).toPersistenceModel();

                expect(normalizePersistenceItems(materialized)).toEqual(normalizePersistenceItems(savedSnapshot));
            } finally {
                await cleanup();
            }
        });
    });
}

function getList(backlog: Backlog, listId: ItemId): ListItem {
    const item = backlog.getItem(listId);
    if (!item || item.kind !== "list") {
        throw new Error(`Expected list ${listId}`);
    }
    return item;
}

function getTask(backlog: Backlog, taskId: ItemId): TaskItem {
    const item = backlog.getItem(taskId);
    if (!item || item.kind !== "task") {
        throw new Error(`Expected task ${taskId}`);
    }
    return item;
}

type NormalizedItem = {
    kind: "list" | "task";
    id: ItemId;
    title: string;
    archived: boolean;
    createdAt: string;
    updatedAt: string;
    parentListId?: ItemId;
    childListIds?: ItemId[];
    description?: string;
    listIds?: ItemId[];
    status?: ItemStatus;
    priority?: Priority;
    estimate?: number;
    persistentCompleted?: boolean;
    repetition?: {
        kind: RepetitionKind;
        interval: number;
        monthlyAnchor?: "SAME_DAY" | "END_OF_MONTH";
        count?: number;
        endDate?: DateKey;
    };
    schedule?: {
        startDate?: DateKey;
        endDate?: DateKey;
        defaultEndTime?: string;
    };
};

function normalizeItems(items: readonly (ListItem | TaskItem)[]): NormalizedItem[] {
    return [...items]
        .map((item) => {
            const common = {
                kind: item.kind,
                id: item.id,
                title: item.title,
                archived: item.archived,
                createdAt: item.createdAt.toISOString(),
                updatedAt: item.updatedAt.toISOString()
            };

            if (item.kind === "list") {
                return {
                    ...common,
                    parentListId: item.parentListId
                } satisfies NormalizedItem;
            }

            return {
                ...common,
                description: item.description,
                listIds: [...item.listIds].sort(),
                status: item.status,
                priority: item.priority,
                estimate: item.estimate,
                persistentCompleted: item.persistentCompleted,
                repetition: {
                    kind: item.repetition.kind,
                    interval: item.repetition.interval,
                    monthlyAnchor: item.repetition.monthlyAnchor,
                    count: item.repetition.count,
                    endDate: item.repetition.endDate
                },
                schedule: item.schedule
                    ? {
                        startDate: item.schedule.startDate,
                        endDate: item.schedule.endDate,
                        defaultEndTime: item.schedule.defaultEndTime
                    }
                    : undefined
            } satisfies NormalizedItem;
        })
        .sort((left, right) => left.id.localeCompare(right.id));
}

function normalizePersistenceItems(items: readonly (ListItem | TaskItem)[]): NormalizedItem[] {
    return [...items]
        .map((item) => {
            const common = {
                kind: item.kind,
                id: item.id,
                title: item.title,
                archived: item.archived,
                createdAt: item.createdAt.toISOString(),
                updatedAt: item.updatedAt.toISOString()
            };

            if (item.kind === "list") {
                return {
                    ...common,
                    parentListId: item.parentListId,
                    childListIds: [...item.childListIds].sort()
                } satisfies NormalizedItem;
            }

            return {
                ...common,
                description: item.description,
                listIds: [...item.listIds].sort(),
                status: item.status,
                priority: item.priority,
                estimate: item.estimate,
                persistentCompleted: item.persistentCompleted,
                repetition: {
                    kind: item.repetition.kind,
                    interval: item.repetition.interval,
                    monthlyAnchor: item.repetition.monthlyAnchor,
                    count: item.repetition.count,
                    endDate: item.repetition.endDate
                },
                schedule: item.schedule
                    ? {
                        startDate: item.schedule.startDate,
                        endDate: item.schedule.endDate,
                        defaultEndTime: item.schedule.defaultEndTime
                    }
                    : undefined
            } satisfies NormalizedItem;
        })
        .sort((left, right) => left.id.localeCompare(right.id));
}

function getChildrenIds(backlog: Backlog, parentId: ItemId): ItemId[] {
    return backlog.getChildren(parentId).map((item) => item.id);
}
