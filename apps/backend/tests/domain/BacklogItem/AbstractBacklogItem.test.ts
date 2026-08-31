import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { AbstractBacklogItem } from "../../../src/domain/backlogItem/AbstractBacklogItem.js";
import { DomainError } from "../../../src/domain/shared/errors.js";
import type { ItemId } from "../../../src/domain/shared/types.js";

class TestBacklogItem extends AbstractBacklogItem {
	readonly kind = "task" as const;

	constructor(props: { id: ItemId; title: string; createdAt: Date }) {
		super(props);
	}
}

function createItem(title = "Initial title"): TestBacklogItem {
	return new TestBacklogItem({
		id: "item-1" as ItemId,
		title,
		createdAt: new Date("2026-08-30T10:00:00.000Z")
	});
}

describe("AbstractBacklogItem", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-08-30T10:00:00.000Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("initializes the common state", () => {
		const item = createItem();

		expect(item.id).toBe("item-1");
		expect(item.title).toBe("Initial title");
		expect(item.kind).toBe("task");
		expect(item.archived).toBe(false);
		expect(item.createdAt.toISOString()).toBe("2026-08-30T10:00:00.000Z");
		expect(item.updatedAt.toISOString()).toBe("2026-08-30T10:00:00.000Z");
	});

	it.each(["", "   ", "\n\t"])("rejects an empty title on rename (%j)", (newTitle) => {
		const item = createItem();

		expect(() => item.rename(newTitle)).toThrow(DomainError);
		expect(item.title).toBe("Initial title");
		expect(item.updatedAt.toISOString()).toBe("2026-08-30T10:00:00.000Z");
	});

	it("renames with a valid title and updates the timestamp", () => {
		const item = createItem();

		vi.setSystemTime(new Date("2026-08-30T10:00:01.000Z"));
		item.rename("Updated title");

		expect(item.title).toBe("Updated title");
		expect(item.updatedAt.toISOString()).toBe("2026-08-30T10:00:01.000Z");
	});

    it("trims whitespace when renaming", () => {
        const item = createItem();
        item.rename("  Padded Title  ");
        expect(item.title).toBe("Padded Title");
    });

	it("archives and unarchives as a state transition cycle", () => {
		const item = createItem();

		vi.setSystemTime(new Date("2026-08-30T10:00:01.000Z"));
		item.archive();

		expect(item.archived).toBe(true);
		expect(item.updatedAt.toISOString()).toBe("2026-08-30T10:00:01.000Z");

		vi.setSystemTime(new Date("2026-08-30T10:00:02.000Z"));
		item.unarchive();

		expect(item.archived).toBe(false);
		expect(item.updatedAt.toISOString()).toBe("2026-08-30T10:00:02.000Z");
	});

	it("allows rename after archive", () => {
		const item = createItem();

		vi.setSystemTime(new Date("2026-08-30T10:00:01.000Z"));
		item.archive();

		vi.setSystemTime(new Date("2026-08-30T10:00:02.000Z"));
		item.rename("Archived title");

		expect(item.archived).toBe(true);
		expect(item.title).toBe("Archived title");
		expect(item.updatedAt.toISOString()).toBe("2026-08-30T10:00:02.000Z");
	});

    it("archiving twice is a no-op and does not touch updatedAt", () => {
        const item = createItem();
        item.archive();
        const after = item.updatedAt;

        vi.setSystemTime(new Date("2026-08-30T10:00:05.000Z"));
        item.archive();

        expect(item.archived).toBe(true);
        expect(item.updatedAt).toBe(after);
    });

    it("unarchiving an already-active item is a no-op and does not touch updatedAt", () => {
        const item = createItem();
        const before = item.updatedAt;

        vi.setSystemTime(new Date("2026-08-30T10:00:05.000Z"));
        item.unarchive();

        expect(item.archived).toBe(false);
        expect(item.updatedAt).toBe(before);
    });

	it("keeps updating the timestamp across multiple mutations", () => {
		const item = createItem();

		vi.setSystemTime(new Date("2026-08-30T10:00:01.000Z"));
		item.rename("Step 1");

		vi.setSystemTime(new Date("2026-08-30T10:00:02.000Z"));
		item.archive();

		vi.setSystemTime(new Date("2026-08-30T10:00:03.000Z"));
		item.unarchive();

		expect(item.title).toBe("Step 1");
		expect(item.archived).toBe(false);
		expect(item.updatedAt.toISOString()).toBe("2026-08-30T10:00:03.000Z");
	});
});
