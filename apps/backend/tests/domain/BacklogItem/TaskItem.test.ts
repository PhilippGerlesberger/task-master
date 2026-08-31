import { describe, it, expect } from "vitest";
import { TaskItem } from "../../../src/domain/backlogItem/TaskItem.js";
import { ItemStatus, RepetitionKind, type ItemId } from "../../../src/domain/shared/types.js";
import { DomainError } from "../../../src/domain/shared/errors.js";

const listId = "list-1" as ItemId;

describe("TaskItem.create", () => {
    it("creates a task with sensible defaults", () => {
        const task = TaskItem.create({ title: "Zähne putzen", listIds: [listId] });

        expect(task.kind).toBe("task");
        expect(task.status).toBe(ItemStatus.TODO);
        expect(task.listIds).toEqual([listId]);
        expect(task.repetition.kind).toBe(RepetitionKind.NONE);
        expect(task.priority).toBeUndefined();
    });

    it("rejects an empty title", () => {
        expect(() => TaskItem.create({ title: "", listIds: [listId] })).toThrow(DomainError);
    });

    it("preserves the description", () => {
        const task = TaskItem.create({ title: "X", description: "Details", listIds: [listId] });
        expect(task.description).toBe("Details"); // deckt Bug 1 ab
    });

    it("trims whitespace from the title on creation", () => {
        const task = TaskItem.create({ title: "  Padded  ", listIds: [listId] });
        expect(task.title).toBe("Padded");
    });
});

describe("TaskItem list membership", () => {
    it("is idempotent when adding the same list twice", () => {
        const task = TaskItem.create({ title: "X", listIds: [listId] });
        task.addToList(listId);
        task.addToList(listId);
        expect(task.listIds).toEqual([listId]);
    });
});