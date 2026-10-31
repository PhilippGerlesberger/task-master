import { describe, expect, it } from "vitest";
import { InfrastructureError } from "../../../src/application/errors.js";
import { sortListRowsByDepth } from "../../../src/infrastructure/repositories/sortListRowsByDepth.js";

describe("sortListRowsByDepth", () => {
    const rows = [
        { id: "level-3", parent_list_id: "level-2" },
        { id: "level-1", parent_list_id: null },
        { id: "level-4", parent_list_id: "level-3" },
        { id: "level-2", parent_list_id: "level-1" }
    ] as const;

    it("sorts shuffled rows parents-first", () => {
        const sorted = sortListRowsByDepth(rows, "parents-first");
        expect(sorted.map((row) => row.id)).toEqual(["level-1", "level-2", "level-3", "level-4"]);
    });

    it("sorts shuffled rows children-first", () => {
        const sorted = sortListRowsByDepth(rows, "children-first");
        expect(sorted.map((row) => row.id)).toEqual(["level-4", "level-3", "level-2", "level-1"]);
    });

    it("returns empty array for empty input", () => {
        expect(sortListRowsByDepth([], "parents-first")).toEqual([]);
    });

    it("throws InfrastructureError on cycles", () => {
        const cyclic = [
            { id: "a", parent_list_id: "b" },
            { id: "b", parent_list_id: "a" }
        ];

        expect(() => sortListRowsByDepth(cyclic, "parents-first")).toThrow(InfrastructureError);
    });
});
