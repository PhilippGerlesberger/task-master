import { describe, expect, it } from "vitest";
import { INBOX_LIST_ID } from "../../src/domain/shared/constants.js";
import { isImportTargetEmpty } from "../../tools/import-json-to-postgres.js";

describe("isImportTargetEmpty", () => {
    it("treats an empty database as empty", () => {
        expect(isImportTargetEmpty([], 0)).toBe(true);
    });

    it("treats a database with only inbox row as empty", () => {
        expect(isImportTargetEmpty([INBOX_LIST_ID], 0)).toBe(true);
    });

    it("treats a database with tasks as non-empty", () => {
        expect(isImportTargetEmpty([INBOX_LIST_ID], 1)).toBe(false);
    });

    it("treats a database with non-inbox lists as non-empty", () => {
        expect(isImportTargetEmpty([INBOX_LIST_ID, "list-1"], 0)).toBe(false);
    });
});
