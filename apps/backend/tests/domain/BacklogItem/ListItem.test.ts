import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListItem } from "../../../src/domain/backlogItem/ListItem.js";
import { DomainError } from "../../../src/domain/shared/errors.js";
import type { ItemId } from "../../../src/domain/shared/types.js";

function createList(title = "Inbox") {
    return ListItem.create({ title, parentId: undefined });
}

describe("ListItem.create", () => {
    it("creates a list with the correct default state", () => {
        const list = createList();

        expect(list.kind).toBe("list");
        expect(list.title).toBe("Inbox");
        expect(list.parentListId).toBeUndefined();
        expect(list.childListIds).toEqual([]);
        expect(list.archived).toBe(false);
    });

    it.each(["", "   ", "\n\t"])("rejects an empty title (%j)", (title) => {
        expect(() => ListItem.create({ title })).toThrow(DomainError);
    });

    it("accepts an optional parent list id", () => {
        const list = ListItem.create({ title: "Projects", parentId: "parent-1" as ItemId });

        expect(list.parentListId).toBe("parent-1");
    });

    it("trims whitespace from the title on creation", () => {
        const list = ListItem.create({ title: "  Padded  " });
        expect(list.title).toBe("Padded");
    });
});

describe("ListItem parent and child transitions", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-30T10:00:00.000Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("moves between parents and updates the timestamp", () => {
        const list = createList("Work");

        vi.setSystemTime(new Date("2026-08-30T10:00:01.000Z"));
        list.moveTo("parent-1" as ItemId);
        expect(list.parentListId).toBe("parent-1");
        expect(list.updatedAt.toISOString()).toBe("2026-08-30T10:00:01.000Z");

        vi.setSystemTime(new Date("2026-08-30T10:00:02.000Z"));
        list.moveTo("parent-2" as ItemId);
        expect(list.parentListId).toBe("parent-2");
        expect(list.updatedAt.toISOString()).toBe("2026-08-30T10:00:02.000Z");
    });

    it("moving to the same parent is a no-op", () => {
        const list = ListItem.create({ title: "Work", parentId: "parent-1" as ItemId });
        const before = list.updatedAt;

        vi.setSystemTime(new Date("2026-08-30T10:00:05.000Z"));
        list.moveTo("parent-1" as ItemId);

        expect(list.updatedAt).toEqual(before);
    });

    it("allows clearing the parent relation by moving to undefined", () => {
        const list = ListItem.create({ title: "Work", parentId: "parent-1" as ItemId });

        vi.setSystemTime(new Date("2026-08-30T10:00:01.000Z"));
        list.moveTo(undefined);

        expect(list.parentListId).toBeUndefined();
        expect(list.updatedAt.toISOString()).toBe("2026-08-30T10:00:01.000Z");
    });

    it("does not touch updatedAt when adding a duplicate child list", () => {
        const list = createList("Projects");

        vi.setSystemTime(new Date("2026-08-30T10:00:01.000Z"));
        list.addChildList("child-1" as ItemId);
        const after = list.updatedAt;

        vi.setSystemTime(new Date("2026-08-30T10:00:05.000Z"));
        list.addChildList("child-1" as ItemId);

        expect(list.childListIds).toEqual(["child-1"]);
        expect(list.updatedAt).toEqual(after);
    });

    it("removing a non-existent child list is a no-op", () => {
        const list = createList("Projects");
        const before = list.updatedAt;

        vi.setSystemTime(new Date("2026-08-30T10:00:05.000Z"));
        list.removeChildList("ghost-id" as ItemId);

        expect(list.updatedAt).toEqual(before);
    });

    it("removes a child list and updates the timestamp", () => {
        const list = createList("Projects");
        list.addChildList("child-1" as ItemId);

        vi.setSystemTime(new Date("2026-08-30T10:00:02.000Z"));
        list.removeChildList("child-1" as ItemId);

        expect(list.childListIds).toEqual([]);
        expect(list.updatedAt.toISOString()).toBe("2026-08-30T10:00:02.000Z");
    });

    it("supports a full child-list lifecycle from add to remove", () => {
        const list = createList("Projects");

        list.addChildList("child-1" as ItemId);
        list.addChildList("child-2" as ItemId);

        expect(list.childListIds).toEqual(["child-1", "child-2"]);

        list.removeChildList("child-1" as ItemId);
        expect(list.childListIds).toEqual(["child-2"]);

        list.removeChildList("child-2" as ItemId);
        expect(list.childListIds).toEqual([]);
    });

    it("keeps the base archive logic working for list items", () => {
        const list = createList("Archived");

        vi.setSystemTime(new Date("2026-08-30T10:00:01.000Z"));
        list.archive();
        expect(list.archived).toBe(true);

        vi.setSystemTime(new Date("2026-08-30T10:00:02.000Z"));
        list.unarchive();
        expect(list.archived).toBe(false);
        expect(list.updatedAt.toISOString()).toBe("2026-08-30T10:00:02.000Z");
    });

    it("rejects becoming its own parent", () => {
        const list = createList();
        expect(() => list.moveTo(list.id)).toThrow(DomainError);
    });

    it("rejects containing itself as a child", () => {
        const list = createList();
        expect(() => list.addChildList(list.id)).toThrow(DomainError);
    });

    it("rejects being moved to one of its child lists", () => {
        const list = createList();
        list.addChildList("child-1" as ItemId);
        expect(() => list.moveTo("child-1" as ItemId)).toThrow(DomainError);
    });
});
