import { describe, expect, it } from "vitest";
import { hasSafeTestDatabaseName } from "./testDatabase.js";

describe("hasSafeTestDatabaseName", () => {
    it("returns true when the database name ends with _test", () => {
        expect(hasSafeTestDatabaseName("postgresql://postgres:postgres@localhost:5432/taskmaster_test?schema=public")).toBe(true);
    });

    it("returns false when the database name does not end with _test", () => {
        expect(hasSafeTestDatabaseName("postgresql://postgres:postgres@localhost:5432/taskmaster?schema=public")).toBe(false);
    });

    it("returns false for malformed URLs", () => {
        expect(hasSafeTestDatabaseName("not-a-url")).toBe(false);
    });
});
