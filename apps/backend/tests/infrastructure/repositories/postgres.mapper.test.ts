import { describe, expect, it } from "vitest";
import { ListItem } from "../../../src/domain/backlogItem/ListItem.js";
import { TaskItem } from "../../../src/domain/backlogItem/TaskItem.js";
import { ItemStatus, RepetitionKind, type DateKey } from "../../../src/domain/shared/types.js";
import { Schedule, RepetitionPattern } from "../../../src/domain/shared/valueObjects.js";
import { dateKeyToUtcDate, toDomainItems, toPersistenceRows, utcDateToDateKey } from "../../../src/infrastructure/repositories/mappers/postgres.mapper.js";

describe("postgres mapper", () => {
    it("round-trips a list tree through persistence rows", () => {
        const root = ListItem.create({ title: "Inbox" });
        const child = ListItem.create({ title: "Project", parentId: root.id });

        const rows = toPersistenceRows([root, child]);
        const hydrated = toDomainItems(rows.listRows, rows.taskRows, rows.taskListRows);

        expect(hydrated).toHaveLength(2);
        expect(hydrated[0].kind).toBe("list");
        expect(hydrated.find((item) => item.id === root.id)?.kind).toBe("list");
        expect((hydrated.find((item) => item.id === child.id) as ListItem).parentListId).toBe(root.id);
        expect((hydrated.find((item) => item.id === root.id) as ListItem).childListIds).toContain(child.id);
    });

    it("round-trips a repeated task with schedule", () => {
        const parent = ListItem.create({ title: "Inbox" });
        const task = TaskItem.reconstitute({
            id: "01J8W2X7A7ZPQQ9A0D5F7YK5D2" as any,
            title: "Ship release",
            createdAt: new Date("2026-01-01T12:00:00.000Z"),
            updatedAt: new Date("2026-01-02T12:00:00.000Z"),
            archived: false,
            description: "Prepare the release",
            listIds: [parent.id],
            priority: 4 as any,
            estimate: 6.5,
            repetition: RepetitionPattern.create({
                kind: RepetitionKind.WEEKLY,
                interval: 2,
                count: 5,
                endDate: "2026-12-31" as DateKey
            }),
            schedule: Schedule.create({
                startDate: "2026-03-29" as DateKey,
                endDate: "2026-12-31" as DateKey,
                defaultEndTime: "18:00"
            }),
            status: ItemStatus.TODO,
            persistentCompleted: false
        });

        const { listRows, taskRows, taskListRows } = toPersistenceRows([parent, task]);
        const hydrated = toDomainItems(listRows, taskRows, taskListRows);
        const reloaded = hydrated.find((item) => item.id === task.id) as TaskItem;

        expect(reloaded.title).toBe(task.title);
        expect(reloaded.description).toBe(task.description);
        expect(reloaded.listIds).toEqual(task.listIds);
        expect(reloaded.repetition.kind).toBe(RepetitionKind.WEEKLY);
        expect(reloaded.repetition.interval).toBe(2);
        expect(reloaded.repetition.count).toBe(5);
        expect(reloaded.repetition.endDate).toBe("2026-12-31");
        expect(reloaded.schedule?.startDate).toBe("2026-03-29");
        expect(reloaded.schedule?.defaultEndTime).toBe("18:00");
    });

    it("round-trips a task without repetition or schedule", () => {
        const parent = ListItem.create({ title: "Inbox" });
        const task = TaskItem.reconstitute({
            id: "01J8W2X7A7ZPQQ9A0D5F7YK5D3" as any,
            title: "Write docs",
            createdAt: new Date("2026-01-01T12:00:00.000Z"),
            updatedAt: new Date("2026-01-02T12:00:00.000Z"),
            archived: false,
            listIds: [parent.id],
            repetition: RepetitionPattern.create({ kind: RepetitionKind.NONE }),
            status: ItemStatus.IN_PROGRESS,
            persistentCompleted: false
        });

        const { listRows, taskRows, taskListRows } = toPersistenceRows([parent, task]);
        const hydrated = toDomainItems(listRows, taskRows, taskListRows);
        const reloaded = hydrated.find((item) => item.id === task.id) as TaskItem;

        expect(reloaded.repetition.kind).toBe(RepetitionKind.NONE);
        expect(reloaded.schedule).toBeUndefined();
        expect(reloaded.status).toBe(ItemStatus.IN_PROGRESS);
    });

    it("stores and restores date keys without timezone drift", () => {
        const dateKeys = ["2026-01-01", "2026-03-29", "2026-12-31"] as const;

        for (const value of dateKeys) {
            const date = dateKeyToUtcDate(value as DateKey);
            expect(date).toBeInstanceOf(Date);
            expect(utcDateToDateKey(date)).toBe(value);
        }
    });
});
